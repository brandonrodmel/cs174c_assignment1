class HermiteSpline {

    constructor(points, tangents) { // TODO: ADD EXCEPTIONS
    //   if(points.length != tangents.length)
    //     throw new Error("# of points must be equal to number of tangents");
    //   if(points.length < 2 || points.length > 20)
    //     throw new Error("Can only support between 2 and 20 points")
      this.points = points;
      this.tangents = tangents;
    }

    get_point(index) {
        return this.points[index];
    }

    get_tangent(index) {
        return this.tangents[index];
    }
  
    // TODO: ADD FUNCTION IMPLEMENTATION
    add(x, y, z, sx, sy, sz) {
        this.points.push([x, y, z, 1]);
        this.tangents.push([sx, sy, sz, 1]);
    } 
  
    // // TODO: SET TANGENT FUNCTION IMPLEMENTATION
    set_tangent(x, y, z, index) {
        this.tangents[index] = [x, y, z, this.tangents[index][3]];
    }
  
    // // TODO: SET POINT FUNCTION IMPLEMENTATION
    set_point(x, y, z, index) {
        this.points[index] = [x, y, z, this.points[index][3]];
    }
  
    // // TODO: GET ARC LENGTH FUNCTION IMPLEMENTATION
    // get_arc_length() {
    //   return 0;
    // }
  }


let control_points = [ // x, y, z, t
    [0, 0, 0, 0], [3, 5, 1, 1]
];

let tangents = [
    [0, 0, 0, 0], [2, 5, 2, 1]
];

const spline = new HermiteSpline(control_points, tangents);

console.log(spline.get_point(1));

spline.set_point(4, 1, 3, 1); // x, y, z, index

console.log(spline.get_point(1));