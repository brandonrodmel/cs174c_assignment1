class HermiteSpline {

    constructor() {
      this.points = []
      this.tangents = [];
      this.t = [];
    }


    get_position(index) {
        return this.points[index];
    }

    get_tangent(index) {
        return this.tangents[index];
    }

    get_t(index) {
        return this.t[index];
    }

    get_point(index) {
        return "pos: " + this.get_position(index) + " | tan: " + this.get_tangent(index) + " | t: " + this.get_t(index);
    }
  
    // add point
    add_point(x, y, z, sx, sy, sz) {
        if(this.points.length < 20) {
            this.points.push([x, y, z]);
            this.tangents.push([sx, sy, sz]);
            this.t.push(1);
        }
    } 
  
    // modify tangent
    set_tangent(index, x, y, z) {
        this.tangents[index] = [x, y, z];
    }
  
    // modify position of point
    set_point(index, x, y, z) { 
        this.points[index] = [x, y, z];
    }
  
    // return arc length
    get_arc_length() {
      return 0;
    }
}


let control_points = [ // x, y, z, t
    [0, 0, 0, 0], [3, 5, 1, 1]
];

let tangents = [
    [0, 0, 0, 0], [2, 5, 2, 1]
];

const spline = new HermiteSpline();

spline.add_point(0, 0, 0, 0, 0, 0);

console.log(spline.get_point(0));

spline.set_point(0, 1, 5, 4);
spline.set_tangent(0, 3, 6, 2);

console.log(spline.get_point(0));

spline.add_point(1, 5, 3, 3, 5, 7);

// console.log(spline.get_point(0));
// console.log(spline.get_point(1));