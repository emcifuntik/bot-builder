function calculateAngle(x1, y1, x2, y2){
  return Math.atan2(y2 - y1, x2 - x1);
}

function intersection(a1, a2, a3, a4) {
  let det = (a1, a2, b1, b2 ) => {
    return a1 * b2 - a2 * b1;
  };

  let getVars = (x1, y1, x2, y2) => {
    return {
      a: y2 - y1,
      b: x1 - x2,
      c: -((x2 - x1) * y1 - (y2 - y1) * x1)
    };
  };
  let equ1 = getVars(a1.x, a1.y, a2.x, a2.y);
  let equ2 = getVars(a3.x, a3.y, a4.x, a4.y);
  let d  = det( equ1.a, equ1.b, equ2.a, equ2.b );
  let d1 = det( equ1.c, equ1.b, equ2.c, equ2.b );
  let d2 = det( equ1.a, equ1.c, equ2.a, equ2.c );
  return {
    x: d1 / d, 
    y: d2 / d
  };
}

function lineCrossRect(x1, y1, x2, y2, rx, ry, w, h) {
  let crosses = [];
  let cross = intersection({x: x1, y:y1}, {x:x2, y:y2}, {x:rx, y:ry}, {x:rx + w, y:ry});
  if(cross && (cross.x >= rx && cross.x <= (rx + w) && cross.y >= ry && cross.y <= (ry + h)))
    crosses.push(cross);
  cross = intersection({x: x1, y:y1}, {x:x2, y:y2}, {x:rx + w, y:ry}, {x:rx + w, y:ry + h});
  if(cross && (cross.x >= rx && cross.x <= (rx + w) && cross.y >= ry && cross.y <= (ry + h)))
    crosses.push(cross);
  cross = intersection({x: x1, y:y1}, {x:x2, y:y2}, {x:rx, y:ry + h}, {x:rx + w, y:ry + h});
  if(cross && (cross.x >= rx && cross.x <= (rx + w) && cross.y >= ry && cross.y <= (ry + h)))
    crosses.push(cross);
  cross = intersection({x: x1, y:y1}, {x:x2, y:y2}, {x:rx, y:ry}, {x:rx, y:ry + h});
  if(cross && (cross.x >= rx && cross.x <= (rx + w) && cross.y >= ry && cross.y <= (ry + h)))
    crosses.push(cross);

  let minI = 0,
    min = false,
    start = {
      x: x1, 
      y: y1
    },
    cur;
  for(let i in crosses) {
    cur = Math.sqrt(Math.pow(crosses[i].x - start.x, 2) + Math.pow(crosses[i].y - start.y, 2));
    if(min == false) {
      min = cur;
      minI = i;
    }
    else if(cur < min) {
      min = cur;
      minI = i;
    }
  }
  return (min === false) ? false : crosses[minI];
}