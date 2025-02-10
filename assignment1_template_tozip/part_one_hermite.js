import {tiny, defs} from './examples/common.js';

// Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;

// TODO: you should implement the required classes here or in another file.

class HermiteSpline {

  constructor() {
    this.points = [];
    this.tangents = [];
    this.t = [];
    this.size = 0;
  }

  get_position(index) { return this.points[index]; }

  get_tangent(index) { return this.tangents[index]; }

  get_t(index) { return this.t[index]; }

  get_point(index) { return "pos: " + this.get_position(index) + " | tan: " + this.get_tangent(index) + " | t: " + this.get_t(index); }

  get_size() { return this.size; }

  // add point
  add_point(x, y, z, sx, sy, sz) {
    if(this.points.length < 20) {
        this.points.push([x, y, z]);
        this.tangents.push([sx, sy, sz]);

        if(this.points.length == 1) // if this is the first point added, set t = 0
          this.t.push(0);
        else {
          this.t.push(1);
          // refactor t's when adding more points
          for(let i = 1; i < this.points.length; i++)
            this.t[i] = i / (this.points.length - 1);
        }
        this.size++;
    }
  } 

  // modify tangent
  set_tangent(index, x, y, z) { this.tangents[index] = [x, y, z]; }

  // modify position of point
  set_point(index, x, y, z) { this.points[index] = [x, y, z]; }

  // return arc length
  get_arc_length() { return 0; }
};

class Curve_Shape extends Shape {
  // curve_function: (t) => vec3
  constructor(curve_function, sample_count, curve_color=color( 1, 0, 0, 1 )) {
    super("position", "normal");

    this.material = { shader: new defs.Phong_Shader(), ambient: 1.0, color: curve_color }
    this.sample_count = sample_count;

    if (curve_function && this.sample_count) {
      for (let i = 0; i < this.sample_count + 1; i++) {
        let t = i / this.sample_count;
        this.arrays.position.push(curve_function(t));
        this.arrays.normal.push(vec3(0, 0, 0)); // have to add normal to make Phong shader work.
      }
    }
  }

  draw(webgl_manager, uniforms) {
    // call super with "LINE_STRIP" mode
    super.draw(webgl_manager, uniforms, Mat4.identity(), this.material, "LINE_STRIP");
  }

  update(webgl_manager, uniforms, curve_function) {
    if (curve_function && this.sample_count) {
      for (let i = 0; i < this.sample_count + 1; i++) {
        let t = 1.0 * i / this.sample_count;
        this.arrays.position[i] = curve_function(t);
      }
    }
    // this.arrays.position.forEach((v, i) => v = curve_function(i / this.sample_count));
    this.copy_onto_graphics_card(webgl_manager.context);
    // Note: vertex count is not changed.
    // not tested if possible to change the vertex count.
  }
};

export
const Part_one_hermite_base = defs.Part_one_hermite_base =
    class Part_one_hermite_base extends Component
    {                                          // **My_Demo_Base** is a Scene that can be added to any display canvas.
                                               // This particular scene is broken up into two pieces for easier understanding.
                                               // The piece here is the base class, which sets up the machinery to draw a simple
                                               // scene demonstrating a few concepts.  A subclass of it, Part_one_hermite,
                                               // exposes only the display() method, which actually places and draws the shapes,
                                               // isolating that code so it can be experimented with on its own.
      init()
      {
        console.log("init")

        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        this.hover = this.swarm = false;
        // At the beginning of our program, load one of each of these shape
        // definitions onto the GPU.  NOTE:  Only do this ONCE per shape it
        // would be redundant to tell it again.  You should just re-use the
        // one called "box" more than once in display() to draw multiple cubes.
        // Don't define more than one blueprint for the same thing here.
        this.shapes = { 'box'  : new defs.Cube(),
          'ball' : new defs.Subdivision_Sphere( 4 ),
          'axis' : new defs.Axis_Arrows() };

          this.curve_fn = null;
          this.sample_cnt = 0;
          this.curve = new Curve_Shape(null, 100);

        // *** Materials: ***  A "material" used on individual shapes specifies all fields
        // that a Shader queries to light/color it properly.  Here we use a Phong shader.
        // We can now tweak the scalar coefficients from the Phong lighting formulas.
        // Expected values can be found listed in Phong_Shader::update_GPU().
        const phong = new defs.Phong_Shader();
        const tex_phong = new defs.Textured_Phong();
        this.materials = {};
        this.materials.plastic = { shader: phong, ambient: .2, diffusivity: 1, specularity: .5, color: color( .9,.5,.9,1 ) }
        this.materials.metal   = { shader: phong, ambient: .2, diffusivity: 1, specularity:  1, color: color( .9,.5,.9,1 ) }
        this.materials.rgb = { shader: tex_phong, ambient: .5, texture: new Texture( "assets/rgb.jpg" ) }

        this.ball_location = vec3(1, 1, 1);
        this.ball_radius = 0.25;

        // TODO: you should create a Spline class instance
        this.spline = new HermiteSpline();
      }


      render_animation( caller )
      {                                                // display():  Called once per frame of animation.  We'll isolate out
        // the code that actually draws things into Part_one_hermite, a
        // subclass of this Scene.  Here, the base class's display only does
        // some initial setup.

        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if( !caller.controls )
        { this.animated_children.push( caller.controls = new defs.Movement_Controls( { uniforms: this.uniforms } ) );
          caller.controls.add_mouse_controls( caller.canvas );

          // Define the global camera and projection matrices, which are stored in shared_uniforms.  The camera
          // matrix follows the usual format for transforms, but with opposite values (cameras exist as
          // inverted matrices).  The projection matrix follows an unusual format and determines how depth is
          // treated when projecting 3D points onto a plane.  The Mat4 functions perspective() or
          // orthographic() automatically generate valid matrices for one.  The input arguments of
          // perspective() are field of view, aspect ratio, and distances to the near plane and far plane.

          // !!! Camera changed here
          Shader.assign_camera( Mat4.look_at (vec3 (10, 10, 10), vec3 (0, 0, 0), vec3 (0, 1, 0)), this.uniforms );
        }
        this.uniforms.projection_transform = Mat4.perspective( Math.PI/4, caller.width/caller.height, 1, 100 );

        // *** Lights: *** Values of vector or point lights.  They'll be consulted by
        // the shader when coloring shapes.  See Light's class definition for inputs.
        const t = this.t = this.uniforms.animation_time/1000;
        const angle = Math.sin( t );

        // const light_position = Mat4.rotation( angle,   1,0,0 ).times( vec4( 0,-1,1,0 ) ); !!!
        // !!! Light changed here
        const light_position = vec4(20 * Math.cos(angle), 20,  20 * Math.sin(angle), 1.0);
        this.uniforms.lights = [ defs.Phong_Shader.light_source( light_position, color( 1,1,1,1 ), 1000000 ) ];

        // draw axis arrows.
        this.shapes.axis.draw(caller, this.uniforms, Mat4.identity(), this.materials.rgb);
      }
    }


export class Part_one_hermite extends Part_one_hermite_base
{                                                    // **Part_one_hermite** is a Scene object that can be added to any display canvas.
                                                     // This particular scene is broken up into two pieces for easier understanding.
                                                     // See the other piece, My_Demo_Base, if you need to see the setup code.
                                                     // The piece here exposes only the display() method, which actually places and draws
                                                     // the shapes.  We isolate that code so it can be experimented with on its own.
                                                     // This gives you a very small code sandbox for editing a simple scene, and for
                                                     // experimenting with matrix transformations.
  render_animation( caller )
  {                                                // display():  Called once per frame of animation.  For each shape that you want to
    // appear onscreen, place a .draw() call for it inside.  Each time, pass in a
    // different matrix value to control where the shape appears.

    // Variables that are in scope for you to use:
    // this.shapes.box:   A vertex array object defining a 2x2x2 cube.
    // this.shapes.ball:  A vertex array object defining a 2x2x2 spherical surface.
    // this.materials.metal:    Selects a shader and draws with a shiny surface.
    // this.materials.plastic:  Selects a shader and draws a more matte surface.
    // this.lights:  A pre-made collection of Light objects.
    // this.hover:  A boolean variable that changes when the user presses a button.
    // shared_uniforms:  Information the shader needs for drawing.  Pass to draw().
    // caller:  Wraps the WebGL rendering context shown onscreen.  Pass to draw().

    // Call the setup code that we left inside the base class:
    super.render_animation( caller );

    /**********************************
     Start coding down here!!!!
     **********************************/
        // From here on down it's just some example shapes drawn for you -- freely
        // replace them with your own!  Notice the usage of the Mat4 functions
        // translation(), scale(), and rotation() to generate matrices, and the
        // function times(), which generates products of matrices.

    const blue = color( 0,0,1,1 ), yellow = color( 1,0.7,0,1 );

    const t = this.t = this.uniforms.animation_time/1000;

    // !!! Draw ground
    let floor_transform = Mat4.translation(0, 0, 0).times(Mat4.scale(10, 0.01, 10));
    this.shapes.box.draw( caller, this.uniforms, floor_transform, { ...this.materials.plastic, color: yellow } );

    // !!! Draw ball (for reference)
    // let ball_transform = Mat4.translation(this.ball_location[0], this.ball_location[1], this.ball_location[2])
    //     .times(Mat4.scale(this.ball_radius, this.ball_radius, this.ball_radius));
    // this.shapes.ball.draw( caller, this.uniforms, ball_transform, { ...this.materials.metal, color: blue } );

    // TODO: you should draw spline here.
    this.curve.draw(caller, this.uniforms);

    // add some fluctuation
    if (this.curve_fn && this.sample_cnt === this.curve.sample_count) {
      this.curve.update(caller, this.uniforms,
          (s) => this.curve_fn(s).plus(vec3(Math.cos(this.t * s), Math.sin(this.t), 0)) );
    }
  }

  render_controls()
  {                                 // render_controls(): Sets up a panel of interactive HTML elements, including
    // buttons with key bindings for affecting this scene, and live info readouts.
    this.control_panel.innerHTML += "Part One:";
    this.new_line();
    this.key_triggered_button( "Parse Commands", [], this.parse_commands );
    this.new_line();
    this.key_triggered_button( "Draw", [], this.update_scene );
    this.new_line();
    this.key_triggered_button( "Load", [], this.load_spline );
    this.new_line();
    this.key_triggered_button( "Export", [], this.export_spline );
    this.new_line();

    /* Some code for your reference
    this.key_triggered_button( "Copy input", [ "c" ], function() {
      let text = document.getElementById("input").value;
      console.log(text);
      document.getElementById("output").value = text;
    } );
    this.new_line();
    this.key_triggered_button( "Relocate", [ "r" ], function() {
      let text = document.getElementById("input").value;
      const words = text.split(' ');
      if (words.length >= 3) {
        const x = parseFloat(words[0]);
        const y = parseFloat(words[1]);
        const z = parseFloat(words[2]);
        this.ball_location = vec3(x, y, z)
        document.getElementById("output").value = "success";
      }
      else {
        document.getElementById("output").value = "invalid input";
      }
    } );
     */
  }

  // add point 1 2 3 4 5 6
  parse_commands() {
    let h_spline = this.spline;

    // split input by lines
    let commands = document.getElementById("input").value.split("\n");

    // remove non alphanumeric characters, except underscores and spaces
    commands = commands.map(c => c.replace(/[^a-zA-Z0-9 _]/g, ''));
    
    // remove extra spaces
    commands = commands.map(c => c.replace(/\s+/g, " ").trim());

    // filter out non-existant commands
    // will only keep: add point, set point/tangent, get_arc_length
    commands = commands.filter(str=> ((str.split(/\s+/)[0] == "add" && str.split(/\s+/)[1] == "point") || 
                                      (str.split(/\s+/)[0] == "set" && (str.split(/\s+/)[1] == "point" || str.split(/\s+/)[1] == "tangent")) || 
                                      str.split(/\s+/)[0] == "get_arc_length"));

    for(let c of commands) {
      let str = c.split(/\s+/);
      let index, x, y, z, sx, sy, sz;
      switch(str[0]) {
        case "add":
          x = parseInt(str[2]);
          y = parseInt(str[3]);
          z = parseInt(str[4]);
          sx = parseInt(str[5]);
          sy = parseInt(str[6]);
          sz = parseInt(str[7]);
          h_spline.add_point(x, y, z, sx, sy, sz);
          let PI = Math.PI;
          this.curve_fn =
            (t) => vec3(
                x * t,
                y * t,
                z * t,
            );
          this.curve = new Curve_Shape(this.curve_fn, 100);
          break;
        case "set":
          if(str[1] == "tangent") {
            index = parseInt(str[2]);
            sx = parseInt(str[3]);
            sy = parseInt(str[4]);
            sz = parseInt(str[5]);
            h_spline.set_tangent(index, x, y, z);
          } else if(str[1] == "point") {
            index = parseInt(str[2]);
            x = parseInt(str[3]);
            y = parseInt(str[4]);
            z = parseInt(str[5]);
            h_spline.set_point(index, x, y, z);
          }

          break;
        case "get_arc_length":
          document.getElementById("output").value = h_spline.get_arc_length();
          break;
        default:
      }
    }

    console.log(commands);
    console.log(h_spline);
  }

  update_scene() { // callback for Draw button
    document.getElementById("output").value = "update_scene";
    const curve_fn = (t) => this.h_spline.get_position(t);
    this.curve = Curve_Shape(curve_fn, this.sample_cnt);
  }

  load_spline() {
    let h_spline = this.spline;

    // split input by lines
    let commands = document.getElementById("input").value.split("\n");

    // remove extra spaces
    commands = commands.map(c => c.replace(/\s+/g, " ").trim());

    // filter out syntax errors
    // commands must start with "<#" or end with "#>", not "< " or " >"
    commands = commands.filter(c => ((c[0] == "<" && c[1] != " ") && (c[c.length-1] == ">" && c[c.length-2] != " ")));

    // remove "<" and ">" for simplicity
    commands = commands.map(c => c.replace(">", "").replace("<", "").trim());

    // only keep n elements
    // create spline with those elements
    if(/^-?\d+$/.test(commands[0])) {
      let n = parseInt(commands[0]);
      commands.splice(n + 1);
      for(let i = 1; i < n + 1; i++) {
        let str = commands[i].split(/\s+/);
        h_spline.add_point(str[0], str[1], str[2], str[3], str[4], str[5]);
      }
    }
    else
      commands = [];
  
    console.log(commands);
    console.log(h_spline);
  }

  export_spline() {
    let h_spline = this.spline;
    let n = parseInt(this.spline.get_size());
    let output = n + "\n";
    for(let i = 0; i < n; i++) {
      output += h_spline.points[i].join(" ") + " " + h_spline.tangents[i].join(" ") + "\n";
    }
    document.getElementById("output").value = output;
  }
}
