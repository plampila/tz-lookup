var Geometry;

(function() {
  "use strict";

  Geometry = {
    intersect: {
      line: {
        line: function(line1, line2) {
          /* This is just a fancy hack that tests the winding of the points to
           * determine which side of each line the points are on. */
          var a = line1[2] - line1[0],
              b = line1[3] - line1[1],
              c = line2[2] - line2[0],
              d = line2[3] - line2[1];

          return (
            ((line2[1] - line1[1]) * a > (line2[0] - line1[0]) * b) !==
            ((line2[3] - line1[1]) * a > (line2[2] - line1[0]) * b) &&
            ((line1[1] - line2[1]) * c > (line1[0] - line2[0]) * d) !==
            ((line1[3] - line2[1]) * c > (line1[2] - line2[0]) * d)
          );
        },
        polygon: function(line1, poly2) {
          /* A line intersects a polygon if it intersects any of its lines. */
          var line2 = new Array(4),
              i;

          line2[0] = poly2[0];
          line2[1] = poly2[1];

          for(i = poly2.length; i; ) {
            line2[3] = line2[1];
            line2[2] = line2[0];
            line2[1] = poly2[--i];
            line2[0] = poly2[--i];

            if(Geometry.intersect.line.line(line1, line2))
              return true;
          }

          return false;
        }
      },
      polygon: {
        line: function(poly, line) {
          return Geometry.intersect.line.polygon(line, poly);
        },
        polygon: function(poly1, poly2) {
          /* Two polygons intersect if any of the lines of one of them
           * intersects the other polygon. */
          var line1 = new Array(4),
              i;

          line1[0] = poly1[0];
          line1[1] = poly1[1];

          for(i = poly1.length; i; ) {
            line1[3] = line1[1];
            line1[2] = line1[0];
            line1[1] = poly1[--i];
            line1[0] = poly1[--i];

            if(Geometry.intersect.line.polygon(line1, poly2))
              return true;
          }

          return false;
        }
      }
    },
    overlap: {
      point: {
        polygon: function(point, poly) {
          var inside = false,
              line = new Array(4),
              i = poly.length;

          line[0] = poly[0];
          line[1] = poly[1];

          while(i) {
            line[3] = line[1];
            line[2] = line[0];
            line[1] = poly[--i];
            line[0] = poly[--i];

            if(((line[1] <= point[1] && point[1] < line[3]) ||
                (line[3] <= point[1] && point[1] < line[1])) &&
               ((point[0] - line[0]) < ((line[2] - line[0]) *
                (point[1] - line[1])) / (line[3] - line[1])))
              inside = !inside;
          }

          return inside;
        }
      },
      polygon: {
        point: function(poly, point) {
          return Geometry.overlap.point.polygon(point, poly);
        },
        polygon: function(poly1, poly2) {
          /* Two polygons overlap if they intersect, or if one is wholly
           * contained within the other. (Testing a single point is adequate
           * for determining either of those latter cases.) */
          return Geometry.intersect.polygon.polygon(poly1, poly2) ||
                 Geometry.overlap.point.polygon(poly1, poly2) ||
                 Geometry.overlap.point.polygon(poly2, poly1);
        }
      }
    },
    length: {
      line: function(line) {
        var x = line[2] - line[0],
            y = line[3] - line[1];

        return Math.sqrt(x * x + y * y);
      }
    },
    reverse: {
      line: function(line) {
        return [line[2], line[3], line[0], line[1]];
      },
      polygon: function(poly) {
        var i = poly.length,
            j = 0,
            copy = new Array(i);

        while(i) {
          i -= 2;

          copy[j    ] = poly[i    ];
          copy[j + 1] = poly[i + 1];

          j += 2;
        }

        return copy;
      }
    },
    remove: {
      polygon: {
        polygon: function(poly, hole) {
          if(Geometry.intersect.polygon.polygon(poly, hole))
            throw new Error("A polygon and it's hole cannot intersect.");

          var line = new Array(4),
              a    = -1,
              b    = -1,
              min  = Number.POSITIVE_INFINITY,
              i, j, dist;

          for(i = poly.length; i; ) {
            line[1] = poly[--i];
            line[0] = poly[--i];

            for(j = hole.length; j; ) {
              line[3] = hole[--j];
              line[2] = hole[--j];
              dist = Geometry.length.line(line);

              /* FIXME: This might have to be more clever, as the line probably
               * does intersect each polygon at the originating point. We
               * really just want to check it against every line on the two
               * polygons that doesn't share a vertex. */
              if(dist < min &&
                 !Geometry.intersect.line.polygon(line, poly) &&
                 !Geometry.intersect.line.polygon(line, hole)) {
                a = i;
                b = j;
                min = dist;
              }
            }
          }

          if(a === -1 || b === -1)
            throw new Error("Cannot remove hole from polygon.");

          /* Reorient the hole so that it's relevant point is at the start. */
          hole = b === 0 ? hole.slice(b) :
                           hole.slice(b).concat(hole.slice(0, b));

          /* Copy that relevant point onto the end. */
          hole.push(hole[0], hole[1]);

          /* Reverse the direction of the hole. */
          Geometry.reverse.polygon(hole);

          /* Finally, return the polygon up through the relevant point, then
           * the hole, then polygon starting at the relevant point (making sure
           * that the polygon's relevant point is on both sides of the hole). */
          return poly.slice(0, a + 2).concat(hole).concat(poly.slice(a));
        }
      }
    }
  };
}());

module.exports = Geometry;