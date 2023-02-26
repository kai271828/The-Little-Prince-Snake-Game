var VSHADER_SOURCE_ENVCUBE = `
  attribute vec4 a_Position;
  varying vec4 v_Position;
  void main() {
    v_Position = a_Position;
    gl_Position = a_Position;
  } 
`;

var FSHADER_SOURCE_ENVCUBE = `
  precision mediump float;
  uniform samplerCube u_envCubeMap;
  uniform mat4 u_viewDirectionProjectionInverse;
  varying vec4 v_Position;
  void main() {
    vec4 t = u_viewDirectionProjectionInverse * v_Position;
    gl_FragColor = textureCube(u_envCubeMap, normalize(t.xyz / t.w));
  }
`;

var VSHADER_SHADOW_SOURCE = `
      attribute vec4 a_Position;
      uniform mat4 u_MvpMatrix;
      void main(){
          gl_Position = u_MvpMatrix * a_Position;
      }
  `;

  var FSHADER_SHADOW_SOURCE = `
  precision mediump float;
  void main(){
    /////////** LOW precision depth implementation **/////
    gl_FragColor = vec4(gl_FragCoord.z, 0.0, 0.0, 1.0);
  }
`;

var VSHADER_SOURCE_BUMP = `
    attribute vec4 a_Position;
    attribute vec2 a_TexCoord;
    attribute vec4 a_Normal;
    attribute vec3 a_Tagent;
    attribute vec3 a_Bitagent;
    attribute float a_crossTexCoord;
    uniform mat4 u_MvpMatrix;
    uniform mat4 u_modelMatrix;
    uniform mat4 u_normalMatrix;
    uniform mat4 u_MvpMatrixOfLight;
    varying vec3 v_PositionInWorld;
    varying vec2 v_TexCoord;
    varying mat4 v_TBN;
    varying vec3 v_Normal;
    varying vec4 v_PositionFromLight;
    void main(){
        gl_Position = u_MvpMatrix * a_Position;
        v_PositionInWorld = (u_modelMatrix * a_Position).xyz; 
        v_Normal = normalize(vec3(u_normalMatrix * a_Normal));
        v_TexCoord = a_TexCoord;
        //create TBN matrix 
        vec3 tagent = normalize(a_Tagent);
        vec3 bitagent = normalize(a_Bitagent);
        vec3 nVector;
        if( a_crossTexCoord > 0.0){
          nVector = cross(tagent, bitagent);
        } else{
          nVector = cross(bitagent, tagent);
        }
        v_TBN = mat4(tagent.x, tagent.y, tagent.z, 0.0, 
                           bitagent.x, bitagent.y, bitagent.z, 0.0,
                           nVector.x, nVector.y, nVector.z, 0.0, 
                           0.0, 0.0, 0.0, 1.0);
        v_PositionFromLight = u_MvpMatrixOfLight * a_Position;
    }    
`;

var FSHADER_SOURCE_BUMP = `
    precision mediump float;
    uniform vec3 u_LightPosition;
    uniform vec3 u_ViewPosition;
    uniform float u_Ka;
    uniform float u_Kd;
    uniform float u_Ks;
    uniform vec3 u_Color;
    uniform float u_shininess;
    uniform sampler2D u_Sampler0;
    uniform sampler2D u_ShadowMap;
    uniform highp mat4 u_normalMatrix;
    varying vec3 v_PositionInWorld;
    varying vec2 v_TexCoord;
    varying mat4 v_TBN;
    varying vec3 v_Normal;
    varying vec4 v_PositionFromLight;
    const float deMachThreshold = 0.005;
    void main(){
        // (you can also input them from ouside and make them different)
        vec3 ambientLightColor = u_Color.rgb;
        vec3 diffuseLightColor = u_Color.rgb;
        // assume white specular light (you can also input it from ouside)
        vec3 specularLightColor = vec3(1.0, 1.0, 1.0);        

        vec3 ambient = ambientLightColor * u_Ka;

        vec3 normal;
        //normal vector from normal map
        vec3 nMapNormal = normalize( texture2D( u_Sampler0, v_TexCoord ).rgb * 2.0 - 1.0 );
        normal = normalize( vec3( u_normalMatrix * v_TBN * vec4( nMapNormal, 1.0) ) );
        
        vec3 lightDirection = normalize(u_LightPosition - v_PositionInWorld);
        float nDotL = max(dot(lightDirection, normal), 0.0);
        vec3 diffuse = diffuseLightColor * u_Kd * nDotL;

        vec3 specular = vec3(0.0, 0.0, 0.0);
        if(nDotL > 0.0) {
            vec3 R = reflect(-lightDirection, normal);
    
            vec3 V = normalize(u_ViewPosition - v_PositionInWorld); 
            float specAngle = clamp(dot(R, V), 0.0, 1.0);
            specular = u_Ks * pow(specAngle, u_shininess) * specularLightColor; 
        }

        //***** shadow
        vec3 shadowCoord = (v_PositionFromLight.xyz/v_PositionFromLight.w)/2.0 + 0.5;
        vec4 rgbaDepth = texture2D(u_ShadowMap, shadowCoord.xy);
        /////////******** LOW precision depth implementation ********///////////
        float depth = rgbaDepth.r;
        float visibility = (shadowCoord.z > depth + deMachThreshold) ? 0.3 : 1.0;

        gl_FragColor = vec4( (ambient + diffuse + specular)*visibility, 1.0);
    }
`;

var VSHADER_SOURCE = `
    attribute vec4 a_Position;
    attribute vec4 a_Normal;
    attribute vec2 a_TexCoord;
    uniform mat4 u_MvpMatrix;
    uniform mat4 u_modelMatrix;
    uniform mat4 u_normalMatrix;
    uniform mat4 u_MvpMatrixOfLight;
    varying vec3 v_Normal;
    varying vec3 v_PositionInWorld;
    varying vec2 v_TexCoord;
    varying vec4 v_PositionFromLight;
    void main(){
        gl_Position = u_MvpMatrix * a_Position;
        v_PositionInWorld = (u_modelMatrix * a_Position).xyz; 
        v_Normal = normalize(vec3(u_normalMatrix * a_Normal));
        v_TexCoord = a_TexCoord;
        v_PositionFromLight = u_MvpMatrixOfLight * a_Position;
    }    
`;

var FSHADER_SOURCE = `
    precision mediump float;
    uniform vec4 u_LightPosition;
    uniform vec3 u_ViewPosition;
    uniform float u_Ka;
    uniform float u_Kd;
    uniform float u_Ks;
    uniform float u_shininess;
    uniform bool u_withTexture;
    uniform sampler2D u_Sampler;
    uniform sampler2D u_ShadowMap;
    uniform vec3 u_Color;
    uniform mat4 u_modelMatrix;
    uniform mat4 u_lightMatrix;
    varying vec3 v_Normal;
    varying vec3 v_PositionInWorld;
    varying vec2 v_TexCoord;
    varying vec4 v_PositionFromLight;
    const float deMachThreshold = 0.005;
    void main(){
        // let ambient and diffuse color are u_Color 
        // (you can also input them from ouside and make them different)
        vec3 ambientLightColor;
        vec3 diffuseLightColor;
        if(u_withTexture){
            ambientLightColor = texture2D( u_Sampler, v_TexCoord ).rgb;
            diffuseLightColor = texture2D( u_Sampler, v_TexCoord ).rgb;
        }
        else{
            ambientLightColor = u_Color;
            diffuseLightColor = u_Color;
        }
        
        // assume white specular light (you can also input it from ouside)
        vec3 specularLightColor = vec3(1.0, 1.0, 1.0);        

        vec3 ambient = ambientLightColor * u_Ka;

        vec3 normal = normalize(v_Normal);
        vec3 lightDirection = normalize((u_lightMatrix * u_LightPosition).xyz - v_PositionInWorld);
        float nDotL = max(dot(lightDirection, normal), 0.0);
        vec3 diffuse = diffuseLightColor * u_Kd * nDotL;

        vec3 specular = vec3(0.0, 0.0, 0.0);
        if(nDotL > 0.0) {
            vec3 R = reflect(-lightDirection, normal);
            // V: the vector, point to viewer       
            vec3 V = normalize(u_ViewPosition - v_PositionInWorld); 
            float specAngle = clamp(dot(R, V), 0.0, 1.0);
            specular = u_Ks * pow(specAngle, u_shininess) * specularLightColor; 
        }

        //***** shadow
        vec3 shadowCoord = (v_PositionFromLight.xyz/v_PositionFromLight.w)/2.0 + 0.5;
        vec4 rgbaDepth = texture2D(u_ShadowMap, shadowCoord.xy);
        /////////******** LOW precision depth implementation ********///////////
        float depth = rgbaDepth.r;
        float visibility = (shadowCoord.z > depth + deMachThreshold) ? 0.3 : 1.0;

        gl_FragColor = vec4( (ambient + diffuse + specular)*visibility, 1.0);
    }
`;

function compileShader(gl, vShaderText, fShaderText){
    //////Build vertex and fragment shader objects
    var vertexShader = gl.createShader(gl.VERTEX_SHADER)
    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)
    //The way to  set up shader text source
    gl.shaderSource(vertexShader, vShaderText)
    gl.shaderSource(fragmentShader, fShaderText)
    //compile vertex shader
    gl.compileShader(vertexShader)
    if(!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)){
        console.log('vertex shader ereror');
        var message = gl.getShaderInfoLog(vertexShader); 
        console.log(message);//print shader compiling error message
    }
    //compile fragment shader
    gl.compileShader(fragmentShader)
    if(!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)){
        console.log('fragment shader ereror');
        var message = gl.getShaderInfoLog(fragmentShader);
        console.log(message);//print shader compiling error message
    }

    /////link shader to program (by a self-define function)
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    //if not success, log the program info, and delete it.
    if(!gl.getProgramParameter(program, gl.LINK_STATUS)){
        alert(gl.getProgramInfoLog(program) + "");
        gl.deleteProgram(program);
    }

    return program;
}

/////BEGIN:///////////////////////////////////////////////////////////////////////////////////////////////
/////The folloing three function is for creating vertex buffer, but link to shader to user later//////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////
function initAttributeVariable(gl, a_attribute, buffer){
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.vertexAttribPointer(a_attribute, buffer.num, buffer.type, false, 0, 0);
  gl.enableVertexAttribArray(a_attribute);
}

function initArrayBufferForLaterUse(gl, data, num, type) {
  // Create a buffer object
  var buffer = gl.createBuffer();
  if (!buffer) {
    console.log('Failed to create the buffer object');
    return null;
  }
  // Write date into the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

  // Store the necessary information to assign the object to the attribute variable later
  buffer.num = num;
  buffer.type = type;

  return buffer;
}

function initVertexBufferForLaterUse(gl, vertices, normals, texCoords, tagents, bitagents, crossTexCoords){
  var nVertices = vertices.length / 3;

  var o = new Object();
  o.vertexBuffer = initArrayBufferForLaterUse(gl, new Float32Array(vertices), 3, gl.FLOAT);
  if( normals != null ) o.normalBuffer = initArrayBufferForLaterUse(gl, new Float32Array(normals), 3, gl.FLOAT);
  if( texCoords != null ) o.texCoordBuffer = initArrayBufferForLaterUse(gl, new Float32Array(texCoords), 2, gl.FLOAT);
  if( tagents != null ) o.tagentsBuffer = initArrayBufferForLaterUse(gl, new Float32Array(tagents), 3, gl.FLOAT);
  if( bitagents != null ) o.bitagentsBuffer = initArrayBufferForLaterUse(gl, new Float32Array(bitagents), 3, gl.FLOAT);
  if( crossTexCoords != null ) o.crossTexCoordsBuffer = initArrayBufferForLaterUse(gl, new Float32Array(crossTexCoords), 1, gl.FLOAT);
  //you can have error check here
  o.numVertices = nVertices;

  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

  return o;
}
/////END://///////////////////////////////////////////////////////////////////////////////////////////////
/////The folloing three function is for creating vertex buffer, but link to shader to user later//////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////

var mouseLastX, mouseLastY;
var mouseDragging = false;
var angleX = 0, angleY = 0;
var gl, canvas;
var mvpMatrix;
var modelMatrix;
var normalMatrix;
var nVertex;
var cameraX = 0.0, cameraY = 0.0, cameraZ = 0.0;
var cameraDirX = 0.01, cameraDirY = 0.01, cameraDirZ = -1;
var lightX = 1, lightY = 10, lightZ = 3;
var record = {};
var rose = [];
var fox = [];
var pyramid = [];
var sphere = [];
var plane = [];
var foxImg = 'texture.png'
var roseImg = 'rose_texture.jpg'
var textures = {};
var moveX = 0;
var moveZ = 0;
var rotateAngle = 0;
var foxAngle = 90;
var lenght = 0;
var newViewDir;
var quadObj;
var cubeMapTex;
var offScreenWidth = 2048, offScreenHeight = 2048;
var fbo;
var cubeObj = [];
var view = 'fpv'
var roseX = getRandomPos(), roseZ = getRandomPos();
var speed = 0.005;
var dir = 'right';
var planeAngle = 0;
var normalMapImg = 'asteroid_normal_map.jpg';
var cubeMvpFromLight, roseMvpFromLight, foxMvpFromLight, planeMvpFromLight;
var currentScore = 0, bestScore = 0;
var cheatMode = false;


function initTexture(gl, img, imgName){
  var tex = gl.createTexture();
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.bindTexture(gl.TEXTURE_2D, tex);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

  // Upload the image into the texture.
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

  textures[imgName] = tex;
}


async function main(){
    canvas = document.getElementById('webgl');
    gl = canvas.getContext('webgl2');
    if(!gl){
        console.log('Failed to get the rendering context for WebGL');
        return ;
    }

    var quad = new Float32Array(
      [
        -1, -1, 1,
         1, -1, 1,
        -1,  1, 1,
        -1,  1, 1,
         1, -1, 1,
         1,  1, 1
      ]); //just a quad

    programEnvCube = compileShader(gl, VSHADER_SOURCE_ENVCUBE, FSHADER_SOURCE_ENVCUBE);
    programEnvCube.a_Position = gl.getAttribLocation(programEnvCube, 'a_Position'); 
    programEnvCube.u_envCubeMap = gl.getUniformLocation(programEnvCube, 'u_envCubeMap'); 
    programEnvCube.u_viewDirectionProjectionInverse = gl.getUniformLocation(programEnvCube, 'u_viewDirectionProjectionInverse');

    quadObj = initVertexBufferForLaterUse(gl, quad);
    cubeMapTex = initCubeTexture("px.png", "nx.png", "py.png", "ny.png", 
                                      "pz.png", "nz.png", 512, 512);

    shadowProgram = compileShader(gl, VSHADER_SHADOW_SOURCE, FSHADER_SHADOW_SOURCE);
    shadowProgram.a_Position = gl.getAttribLocation(shadowProgram, 'a_Position');
    shadowProgram.u_MvpMatrix = gl.getUniformLocation(shadowProgram, 'u_MvpMatrix');

    program = compileShader(gl, VSHADER_SOURCE, FSHADER_SOURCE);
    program.a_Position = gl.getAttribLocation(program, 'a_Position');
    program.a_TexCoord = gl.getAttribLocation(program, 'a_TexCoord');  
    program.a_Normal = gl.getAttribLocation(program, 'a_Normal'); 
    program.u_MvpMatrix = gl.getUniformLocation(program, 'u_MvpMatrix'); 
    program.u_modelMatrix = gl.getUniformLocation(program, 'u_modelMatrix');
    program.u_lightMatrix  = gl.getUniformLocation(program, 'u_lightMatrix');
    program.u_normalMatrix = gl.getUniformLocation(program, 'u_normalMatrix');
    program.u_LightPosition = gl.getUniformLocation(program, 'u_LightPosition');
    program.u_ViewPosition = gl.getUniformLocation(program, 'u_ViewPosition');
    program.u_MvpMatrixOfLight = gl.getUniformLocation(program, 'u_MvpMatrixOfLight');
    program.u_Ka = gl.getUniformLocation(program, 'u_Ka'); 
    program.u_Kd = gl.getUniformLocation(program, 'u_Kd');
    program.u_Ks = gl.getUniformLocation(program, 'u_Ks');
    program.u_shininess = gl.getUniformLocation(program, 'u_shininess');
    program.u_Color = gl.getUniformLocation(program, 'u_Color'); 
    program.u_Sampler = gl.getUniformLocation(program, 'u_Sampler');
    program.u_ShadowMap = gl.getUniformLocation(program, "u_ShadowMap");
    program.u_withTexture = gl.getUniformLocation(program, 'u_withTexture');

    programBump = compileShader(gl, VSHADER_SOURCE_BUMP, FSHADER_SOURCE_BUMP);
    programBump.a_Position = gl.getAttribLocation(programBump, 'a_Position'); 
    programBump.a_Normal = gl.getAttribLocation(programBump, 'a_Normal'); 
    programBump.a_TexCoord = gl.getAttribLocation(programBump, 'a_TexCoord'); 
    programBump.a_Tagent = gl.getAttribLocation(programBump, 'a_Tagent'); 
    programBump.a_Bitagent = gl.getAttribLocation(programBump, 'a_Bitagent'); 
    programBump.a_crossTexCoord = gl.getAttribLocation(programBump, 'a_crossTexCoord'); 
    programBump.u_MvpMatrix = gl.getUniformLocation(programBump, 'u_MvpMatrix'); 
    programBump.u_modelMatrix = gl.getUniformLocation(programBump, 'u_modelMatrix'); 
    programBump.u_normalMatrix = gl.getUniformLocation(programBump, 'u_normalMatrix');
    programBump.u_LightPosition = gl.getUniformLocation(programBump, 'u_LightPosition');
    programBump.u_ViewPosition = gl.getUniformLocation(programBump, 'u_ViewPosition');
    programBump.u_MvpMatrixOfLight = gl.getUniformLocation(programBump, 'u_MvpMatrixOfLight');
    programBump.u_Ka = gl.getUniformLocation(programBump, 'u_Ka'); 
    programBump.u_Kd = gl.getUniformLocation(programBump, 'u_Kd');
    programBump.u_Ks = gl.getUniformLocation(programBump, 'u_Ks');
    programBump.u_Color = gl.getUniformLocation(programBump, 'u_Color');
    programBump.u_shininess = gl.getUniformLocation(programBump, 'u_shininess');
    programBump.u_Sampler0 = gl.getUniformLocation(programBump, 'u_Sampler0');
    programBump.u_ShadowMap = gl.getUniformLocation(programBump, "u_ShadowMap");

    var normalMapImage = new Image();
    normalMapImage.onload = function(){initTexture(gl, normalMapImage, normalMapImg);};
    normalMapImage.src = normalMapImg;

    /////3D model rose
    response = await fetch('rose.obj');
    text = await response.text();
    obj = parseOBJ(text);
    for( let i=0; i < obj.geometries.length; i ++ ){
      let o = initVertexBufferForLaterUse(gl, 
                                          obj.geometries[i].data.position,
                                          obj.geometries[i].data.normal, 
                                          obj.geometries[i].data.texcoord);
      rose.push(o);
    }

    let rimage = new Image();
    rimage.onload = function(){initTexture(gl, rimage, roseImg);};
    rimage.src = roseImg;

    /////3D model fox
    response = await fetch('low-poly-fox-by-pixelmannen.obj');
    text = await response.text();
    obj = parseOBJ(text);
    for( let i=0; i < obj.geometries.length; i ++ ){
      let o = initVertexBufferForLaterUse(gl, 
                                          obj.geometries[i].data.position,
                                          obj.geometries[i].data.normal, 
                                          obj.geometries[i].data.texcoord);
      fox.push(o);
    }

    
    let fimage = new Image();
    fimage.onload = function(){initTexture(gl, fimage, foxImg);};
    fimage.src = foxImg;

    /////3D model plane
    response = await fetch('plane.obj');
    text = await response.text();
    obj = parseOBJ(text);
    for( let i=0; i < obj.geometries.length; i ++ ){
      let o = initVertexBufferForLaterUse(gl, 
                                          obj.geometries[i].data.position,
                                          obj.geometries[i].data.normal, 
                                          obj.geometries[i].data.texcoord);
      plane.push(o);
    }

    /////3D model sphere
    response = await fetch('sphere.obj');
    text = await response.text();
    obj = parseOBJ(text);
    for( let i=0; i < obj.geometries.length; i ++ ){
      let o = initVertexBufferForLaterUse(gl, 
                                          obj.geometries[i].data.position,
                                          obj.geometries[i].data.normal, 
                                          obj.geometries[i].data.texcoord);
      sphere.push(o);
    }

    /////3D model pyramid
    response = await fetch('pyramid.obj');
    text = await response.text();
    obj = parseOBJ(text);
    for( let i=0; i < obj.geometries.length; i ++ ){
      let o = initVertexBufferForLaterUse(gl, 
                                          obj.geometries[i].data.position,
                                          obj.geometries[i].data.normal, 
                                          obj.geometries[i].data.texcoord);
      pyramid.push(o);
    }

    //
    response = await fetch('cube.obj');
    text = await response.text();
    obj = parseOBJ(text);
    for( let i=0; i < obj.geometries.length; i ++ ){
      let tagentSpace = calculateTangentSpace(obj.geometries[i].data.position, 
                                              obj.geometries[i].data.texcoord);
      let o = initVertexBufferForLaterUse(gl, 
                                          obj.geometries[i].data.position,
                                          obj.geometries[i].data.normal, 
                                          obj.geometries[i].data.texcoord,
                                          tagentSpace.tagents,
                                          tagentSpace.bitagents,
                                          tagentSpace.crossTexCoords);
      cubeObj.push(o);
    }

    fbo = initFrameBuffer(gl);

    mvpMatrix = new Matrix4();
    modelMatrix = new Matrix4();
    normalMatrix = new Matrix4();

    gl.enable(gl.DEPTH_TEST);

    var tick = function() {
      
      planeAngle += (currentScore + 1) / 50.0;
      if(planeAngle >= 1440){
        planeAngle = 0;
      }
      
      if(cheatMode == true){

        if(moveX > roseX + 0.1){
          dir = 'left';
        }
        else if(moveX < roseX - 0.1){
          dir = 'right';
        }
        else if(moveZ > roseZ + 0.1){
          dir = 'up';
        }
        else if(moveZ < roseZ - 0.1){
          dir = 'down';
        }

      }

      if(dir == 'right'){
        foxAngle = 90;
        if(view == 'fpv'){
          cameraX += speed;
        }
        else{
          record.cameraX += speed;
        }
        
        moveX += speed;
      }
      else if(dir == 'left'){
        foxAngle = 270;
        if(view == 'fpv'){
          cameraX -= speed;
        }
        else{
          record.cameraX -= speed;
        }

        moveX -= speed;
      }
      else if(dir == 'up'){
        foxAngle = 180;
        if(view == 'fpv'){
          cameraZ -= speed;
        }
        else{
          record.cameraZ -= speed;
        }

        moveZ -= speed;
      }
      else if(dir == 'down'){
        foxAngle = 0;
        if(view == 'fpv'){
          cameraZ += speed;
        }
        else{
          record.cameraZ += speed;
        }

        moveZ += speed;
      }

      if(distance(moveX, moveZ, roseX, roseZ) < 0.3){
        if(speed < 0.15){
          speed += 0.001;
        }
        
        roseX = getRandomPos();
        roseZ = getRandomPos();
        updateScore();
      }

      //console.log(moveX, moveZ);
      if(moveX > 6 || moveX < -6 || moveZ > 6 || moveZ < -6){
        speed = 0.005;
        moveX = 0;
        moveZ = 0;
        if(view == 'fpv'){
          cameraX = 0.0;
          cameraY = 0.0;
          cameraZ = 0.0;
        }
        else{
          record.cameraX = 0.0;
          record.cameraY = 0.0;
          record.cameraZ = 0.0;
        }

        resetScore();
        
      }
      
      draw();
      requestAnimationFrame(tick);
  }
  tick();

    canvas.onmousedown = function(ev){mouseDown(ev)};
    canvas.onmousemove = function(ev){mouseMove(ev)};
    canvas.onmouseup = function(ev){mouseUp(ev)};
    //canvas.onwheel = function(ev){scrollWheel(ev)};
    document.onkeydown = function(ev){keydown(ev)};
}

/////Call drawOneObject() here to draw all object one by one 
////   (setup the model matrix and color to draw)
function draw(){

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, offScreenWidth, offScreenHeight);
    drawOffScene();
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    drawScene();
}

//obj: the object components
//mdlMatrix: the model matrix without mouse rotation
//colorR, G, B: object color
function drawOneObject(obj, mdlMatrix, newViewDir, mvpFromLight, colorR, colorG, colorB){
    //model Matrix (part of the mvp matrix)
    modelMatrix.setIdentity();
    //modelMatrix.setRotate(angleY, 1, 0, 0);//for mouse rotation
    //modelMatrix.rotate(angleX, 0, 1, 0);//for mouse rotation
    gl.uniformMatrix4fv(program.u_lightMatrix, false, modelMatrix.elements);
    modelMatrix.multiply(mdlMatrix);

    //mvp: projection * view * model matrix  
    mvpMatrix.setPerspective(30, 1, 1, 100);
    mvpMatrix.lookAt(cameraX, cameraY, cameraZ,
      cameraX + newViewDir.elements[0],
      cameraY + newViewDir.elements[1],
      cameraZ + newViewDir.elements[2],
      0, 1, 0);
    mvpMatrix.multiply(modelMatrix);

    //normal matrix
    normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();

    let lightMatrix = new Matrix4();
    lightMatrix.setRotate(angleY, 1, 0, 0);
    lightMatrix.rotate(angleX, 0, 1, 0);

    gl.uniform4f(program.u_LightPosition, lightX, lightY, lightZ, 1);
    gl.uniform3f(program.u_ViewPosition, cameraX, cameraY, cameraZ);
    gl.uniform1f(program.u_Ka, 0.2);
    gl.uniform1f(program.u_Kd, 0.7);
    gl.uniform1f(program.u_Ks, 1.0);
    gl.uniform1f(program.u_shininess, 10.0);
    gl.uniform3f(program.u_Color, colorR, colorG, colorB);


    gl.uniformMatrix4fv(program.u_MvpMatrix, false, mvpMatrix.elements);
    gl.uniformMatrix4fv(program.u_modelMatrix, false, modelMatrix.elements);
    gl.uniformMatrix4fv(program.u_normalMatrix, false, normalMatrix.elements);
    gl.uniformMatrix4fv(program.u_MvpMatrixOfLight, false, mvpFromLight.elements);
    
    gl.uniform1i(program.u_withTexture, 0);

    for( let i=0; i < obj.length; i ++ ){
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, fbo.texture);
      gl.uniform1i(program.u_ShadowMap, 1);
      
      initAttributeVariable(gl, program.a_Position, obj[i].vertexBuffer);
      initAttributeVariable(gl, program.a_Normal, obj[i].normalBuffer);
      gl.drawArrays(gl.TRIANGLES, 0, obj[i].numVertices);
    }
}

function drawOneObjectWithTexture(obj, mdlMatrix, newViewDir, mvpFromLight, img){
  //model Matrix (part of the mvp matrix)
    modelMatrix.setIdentity();
    //modelMatrix.setRotate(angleY, 1, 0, 0);//for mouse rotation
    //modelMatrix.rotate(angleX, 0, 1, 0);//for mouse rotation
    gl.uniformMatrix4fv(program.u_lightMatrix, false, modelMatrix.elements);
    modelMatrix.multiply(mdlMatrix);

  //mvp: projection * view * model matrix  
  mvpMatrix.setPerspective(30, 1, 1, 100);
  mvpMatrix.lookAt(cameraX, cameraY, cameraZ,
    cameraX + newViewDir.elements[0],
    cameraY + newViewDir.elements[1],
    cameraZ + newViewDir.elements[2],
    0, 1, 0);
  mvpMatrix.multiply(modelMatrix);

  //normal matrix
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();

  //light matrix
  let lightMatrix = new Matrix4();
  lightMatrix.setRotate(angleY, 1, 0, 0);
  lightMatrix.rotate(angleX, 0, 1, 0);

  gl.uniform4f(program.u_LightPosition, lightX, lightY, lightZ, 1);
  gl.uniform3f(program.u_ViewPosition, cameraX, cameraY, cameraZ);
  gl.uniform1f(program.u_Ka, 0.2);
  gl.uniform1f(program.u_Kd, 0.7);
  gl.uniform1f(program.u_Ks, 1.0);
  gl.uniform1f(program.u_shininess, 10.0);
  /**        texture       */

  gl.uniformMatrix4fv(program.u_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(program.u_modelMatrix, false, modelMatrix.elements);
  gl.uniformMatrix4fv(program.u_normalMatrix, false, normalMatrix.elements);
  gl.uniformMatrix4fv(program.u_MvpMatrixOfLight, false, mvpFromLight.elements);

  gl.uniform1i(program.u_withTexture, 1);

  for( let i=0; i < obj.length; i ++ ){
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures[img]);
    gl.uniform1i(program.u_Sampler, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, fbo.texture);
    gl.uniform1i(program.u_ShadowMap, 1);
    
    initAttributeVariable(gl, program.a_Position, obj[i].vertexBuffer);
    initAttributeVariable(gl, program.a_TexCoord, obj[i].texCoordBuffer);
    initAttributeVariable(gl, program.a_Normal, obj[i].normalBuffer);

    gl.drawArrays(gl.TRIANGLES, 0, obj[i].numVertices);
  }
}

function drawOneObjectOffScreen(obj, mdlMatrix, newViewDir){
  var mvpFromLight = new Matrix4();
  let modelMatrix = new Matrix4();
  modelMatrix.multiply(mdlMatrix);

  //mvp: projection * view * model matrix
  mvpFromLight.setPerspective(70, offScreenWidth/offScreenHeight, 1, 15);
  mvpFromLight.lookAt(lightX, lightY, lightZ, 0, 0, 0, 0, 1, 0);
  mvpFromLight.multiply(modelMatrix);

  gl.uniformMatrix4fv(shadowProgram.u_MvpMatrix, false, mvpFromLight.elements);

  for( let i=0; i < obj.length; i ++ ){
    initAttributeVariable(gl, shadowProgram.a_Position, obj[i].vertexBuffer);
    gl.drawArrays(gl.TRIANGLES, 0, obj[i].numVertices);
  }

  return mvpFromLight;
}

function parseOBJ(text) {
  // because indices are base 1 let's just fill in the 0th data
  const objPositions = [[0, 0, 0]];
  const objTexcoords = [[0, 0]];
  const objNormals = [[0, 0, 0]];

  // same order as `f` indices
  const objVertexData = [
    objPositions,
    objTexcoords,
    objNormals,
  ];

  // same order as `f` indices
  let webglVertexData = [
    [],   // positions
    [],   // texcoords
    [],   // normals
  ];

  const materialLibs = [];
  const geometries = [];
  let geometry;
  let groups = ['default'];
  let material = 'default';
  let object = 'default';

  const noop = () => {};

  function newGeometry() {
    // If there is an existing geometry and it's
    // not empty then start a new one.
    if (geometry && geometry.data.position.length) {
      geometry = undefined;
    }
  }

  function setGeometry() {
    if (!geometry) {
      const position = [];
      const texcoord = [];
      const normal = [];
      webglVertexData = [
        position,
        texcoord,
        normal,
      ];
      geometry = {
        object,
        groups,
        material,
        data: {
          position,
          texcoord,
          normal,
        },
      };
      geometries.push(geometry);
    }
  }

  function addVertex(vert) {
    const ptn = vert.split('/');
    ptn.forEach((objIndexStr, i) => {
      if (!objIndexStr) {
        return;
      }
      const objIndex = parseInt(objIndexStr);
      const index = objIndex + (objIndex >= 0 ? 0 : objVertexData[i].length);
      webglVertexData[i].push(...objVertexData[i][index]);
    });
  }

  const keywords = {
    v(parts) {
      objPositions.push(parts.map(parseFloat));
    },
    vn(parts) {
      objNormals.push(parts.map(parseFloat));
    },
    vt(parts) {
      // should check for missing v and extra w?
      objTexcoords.push(parts.map(parseFloat));
    },
    f(parts) {
      setGeometry();
      const numTriangles = parts.length - 2;
      for (let tri = 0; tri < numTriangles; ++tri) {
        addVertex(parts[0]);
        addVertex(parts[tri + 1]);
        addVertex(parts[tri + 2]);
      }
    },
    s: noop,    // smoothing group
    mtllib(parts, unparsedArgs) {
      // the spec says there can be multiple filenames here
      // but many exist with spaces in a single filename
      materialLibs.push(unparsedArgs);
    },
    usemtl(parts, unparsedArgs) {
      material = unparsedArgs;
      newGeometry();
    },
    g(parts) {
      groups = parts;
      newGeometry();
    },
    o(parts, unparsedArgs) {
      object = unparsedArgs;
      newGeometry();
    },
  };

  const keywordRE = /(\w*)(?: )*(.*)/;
  const lines = text.split('\n');
  for (let lineNo = 0; lineNo < lines.length; ++lineNo) {
    const line = lines[lineNo].trim();
    if (line === '' || line.startsWith('#')) {
      continue;
    }
    const m = keywordRE.exec(line);
    if (!m) {
      continue;
    }
    const [, keyword, unparsedArgs] = m;
    const parts = line.split(/\s+/).slice(1);
    const handler = keywords[keyword];
    if (!handler) {
      console.warn('unhandled keyword:', keyword);  // eslint-disable-line no-console
      continue;
    }
    handler(parts, unparsedArgs);
  }

  // remove any arrays that have no entries.
  for (const geometry of geometries) {
    geometry.data = Object.fromEntries(
        Object.entries(geometry.data).filter(([, array]) => array.length > 0));
  }

  return {
    geometries,
    materialLibs,
  };
}

function mouseDown(ev){ 
    var x = ev.clientX;
    var y = ev.clientY;
    var rect = ev.target.getBoundingClientRect();
    if( rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom){
        mouseLastX = x;
        mouseLastY = y;
        mouseDragging = true;
    }
}

function mouseUp(ev){ 
    mouseDragging = false;
}

function mouseMove(ev){ 
    var x = ev.clientX;
    var y = ev.clientY;
    if( mouseDragging ){
        var factor = 100/canvas.height; //100 determine the spped you rotate the object
        var dx = factor * (x - mouseLastX);
        var dy = factor * (y - mouseLastY);

        angleX += dx; //yes, x for y, y for x, this is right
        angleY += dy;
    }
    mouseLastX = x;
    mouseLastY = y;

    draw();
}

function keydown(ev){ 
  //implment keydown event here
  let rotateMatrix = new Matrix4();
  rotateMatrix.setRotate(angleY, 1, 0, 0);//for mouse rotation
  rotateMatrix.rotate(angleX, 0, 1, 0);//for mouse rotation
  var viewDir= new Vector3([cameraDirX, cameraDirY, cameraDirZ]);
  newViewDir = rotateMatrix.multiplyVector3(viewDir);

  if(ev.key == 'w'){ 
     dir = 'up';
     
  }
  else if(ev.key == 's'){
    dir = 'down';
    
  }
  else if(ev.key == 'a'){
    dir = 'left';
    
  }
  else if(ev.key == 'd'){
    dir = 'right';
    
  }
  else if(ev.key == 'v'){
    if(view == 'fpv'){
      view = 'tpv';
      record.cameraX = cameraX;
      record.cameraY = cameraY;
      record.cameraZ = cameraZ;
      record.cameraDirX = cameraDirX;
      record.cameraDirY = cameraDirY;
      record.cameraDirZ = cameraDirZ;
      record.angleX = angleX;
      record.angleY = angleY;

      angleX = 0;
      angleY = 0;
      cameraX = 0.1;
      cameraY = 15;
      cameraZ = 15;
      cameraDirX = -0.1;
      cameraDirY = -1;
      cameraDirZ = -1;
    }
    else{
      view = 'fpv';
      cameraX = record.cameraX;
      cameraY = record.cameraY;
      cameraZ = record.cameraZ;
      cameraDirX = record.cameraDirX;
      cameraDirY = record.cameraDirY;
      cameraDirZ = record.cameraDirZ;
      angleX = record.angleX;
      angleY = record.angleY;
    }
  }
  else if(ev.key == 'c'){
    cheatMode = !cheatMode;
  }

  draw();
}

function initCubeTexture(posXName, negXName, posYName, negYName, 
  posZName, negZName, imgWidth, imgHeight)
{
var texture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

const faceInfos = [
{
target: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
fName: posXName,
},
{
target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
fName: negXName,
},
{
target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
fName: posYName,
},
{
target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
fName: negYName,
},
{
target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
fName: posZName,
},
{
target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
fName: negZName,
},
];
faceInfos.forEach((faceInfo) => {
const {target, fName} = faceInfo;
// setup each face so it's immediately renderable
gl.texImage2D(target, 0, gl.RGBA, imgWidth, imgHeight, 0, 
gl.RGBA, gl.UNSIGNED_BYTE, null);

var image = new Image();
image.onload = function(){
gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
gl.texImage2D(target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
};
image.src = fName;
});
gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

return texture;
}

function initFrameBuffer(gl){
  //create and set up a texture object as the color buffer
  var texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, offScreenWidth, offScreenHeight,
                  0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  

  //create and setup a render buffer as the depth buffer
  var depthBuffer = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, 
                          offScreenWidth, offScreenHeight);

  //create and setup framebuffer: linke the color and depth buffer to it
  var frameBuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, 
                            gl.TEXTURE_2D, texture, 0);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, 
                              gl.RENDERBUFFER, depthBuffer);
  frameBuffer.texture = texture;
  return frameBuffer;
}

function drawScene(){
    gl.clearColor(0,0,0,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let rotateMatrix = new Matrix4();
    rotateMatrix.setRotate(angleY, 1, 0, 0);//for mouse rotation
    rotateMatrix.rotate(angleX, 0, 1, 0);//for mouse rotation
    var viewDir= new Vector3([cameraDirX, cameraDirY, cameraDirZ]);
    newViewDir = rotateMatrix.multiplyVector3(viewDir);

    var vpFromCamera = new Matrix4();
    vpFromCamera.setPerspective(60, 1, 1, 15);
    var viewMatrixRotationOnly = new Matrix4();
    viewMatrixRotationOnly.lookAt(cameraX, cameraY, cameraZ, 
                                cameraX + newViewDir.elements[0], 
                                cameraY + newViewDir.elements[1], 
                                cameraZ + newViewDir.elements[2], 
                                0, 1, 0);
    viewMatrixRotationOnly.elements[12] = 0; //ignore translation
    viewMatrixRotationOnly.elements[13] = 0;
    viewMatrixRotationOnly.elements[14] = 0;
    vpFromCamera.multiply(viewMatrixRotationOnly);
    var vpFromCameraInverse = vpFromCamera.invert();

    //background
    gl.useProgram(programEnvCube);
    gl.depthFunc(gl.LEQUAL);
    gl.uniformMatrix4fv(programEnvCube.u_viewDirectionProjectionInverse, false, vpFromCameraInverse.elements);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMapTex);
    gl.uniform1i(programEnvCube.u_envCubeMap, 0);
    initAttributeVariable(gl, programEnvCube.a_Position, quadObj.vertexBuffer);
    gl.drawArrays(gl.TRIANGLES, 0, quadObj.numVertices);


    let mdlMatrix = new Matrix4(); //model matrix of objects
    
    gl.useProgram(programBump);
    //Cube (ground)
    mdlMatrix.translate(0.0, -1.0, 0.0);
    mdlMatrix.scale(5, 0.1, 5);
    drawOneObjectWithNormalMap(cubeObj, mdlMatrix, newViewDir, cubeMvpFromLight, 106 / 255.0, 122 / 255.0, 166 / 255.0);
    
    gl.useProgram(program);
    //rose
    mdlMatrix.setIdentity();
    mdlMatrix.translate(roseX, -0.9, roseZ);
    mdlMatrix.scale(0.01, 0.01, 0.01);
    drawOneObjectWithTexture(rose, mdlMatrix, newViewDir, roseMvpFromLight, roseImg);

    //fox
    mdlMatrix.setIdentity();
    mdlMatrix.translate(moveX, -0.9, moveZ);
    mdlMatrix.rotate(foxAngle, 0, 1, 0);
    mdlMatrix.scale(0.01, 0.01, 0.01);
    drawOneObjectWithTexture(fox, mdlMatrix, newViewDir, foxMvpFromLight, foxImg);

    //plane
    mdlMatrix.setIdentity();
    if(planeAngle % 720 > 360){
      mdlMatrix.rotate(planeAngle, 1, 1, 0);
    }
    else{
      mdlMatrix.rotate(planeAngle, 1, -1, 0);
    }
    
    mdlMatrix.translate(0, 6, 0);
    mdlMatrix.scale(0.0005, 0.0005, 0.0005);
    drawOneObject(plane, mdlMatrix, newViewDir, planeMvpFromLight, 196 / 255.0, 30 / 255.0, 58 / 255.0);
    //draw the light point
    mdlMatrix.setIdentity();
    
    mdlMatrix.translate(5.0, 5.0, 5.0);
    mdlMatrix.scale(0.5, 0.5, 0.5);
    //drawOneObject(sphere, mdlMatrix, newViewDir, 1.0, 1.0, 1.0);
}

function drawOffScene(){
  gl.useProgram(shadowProgram);
  gl.clearColor(0.0, 0.0, 0.0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  let rotateMatrix = new Matrix4();
  rotateMatrix.setRotate(angleY, 1, 0, 0);//for mouse rotation
  rotateMatrix.rotate(angleX, 0, 1, 0);//for mouse rotation
  var viewDir= new Vector3([cameraDirX, cameraDirY, cameraDirZ]);
  newViewDir = rotateMatrix.multiplyVector3(viewDir);

  var vpFromCamera = new Matrix4();
  vpFromCamera.setPerspective(60, 1, 1, 15);
  var viewMatrixRotationOnly = new Matrix4();
  viewMatrixRotationOnly.lookAt(cameraX, cameraY, cameraZ, 
                              cameraX + newViewDir.elements[0], 
                              cameraY + newViewDir.elements[1], 
                              cameraZ + newViewDir.elements[2], 
                              0, 1, 0);
  viewMatrixRotationOnly.elements[12] = 0; //ignore translation
  viewMatrixRotationOnly.elements[13] = 0;
  viewMatrixRotationOnly.elements[14] = 0;

  let mdlMatrix = new Matrix4(); //model matrix of objects
    
  //Cube (ground)
  mdlMatrix.translate(0.0, -1.0, 0.0);
  mdlMatrix.scale(5, 0.1, 5);
  cubeMvpFromLight = drawOneObjectOffScreen(cubeObj, mdlMatrix, newViewDir);
    
  //rose
  mdlMatrix.setIdentity();
  mdlMatrix.translate(roseX, -0.9, roseZ);
  mdlMatrix.scale(0.01, 0.01, 0.01);
  roseMvpFromLight = drawOneObjectOffScreen(rose, mdlMatrix, newViewDir);

  //fox
  mdlMatrix.setIdentity();
  mdlMatrix.translate(moveX, -0.9, moveZ);
  mdlMatrix.rotate(foxAngle, 0, 1, 0);
  mdlMatrix.scale(0.01, 0.01, 0.01);
  foxMvpFromLight = drawOneObjectOffScreen(fox, mdlMatrix, newViewDir);

  //plane
  mdlMatrix.setIdentity();
  if(planeAngle % 720 > 360){
    mdlMatrix.rotate(planeAngle, 1, 1, 0);
  }
  else{
    mdlMatrix.rotate(planeAngle, 1, -1, 0);
  }
    
  mdlMatrix.translate(0, 6, 0);
  mdlMatrix.scale(0.0005, 0.0005, 0.0005);
  planeMvpFromLight = drawOneObjectOffScreen(plane, mdlMatrix, newViewDir);

}

function getRandomPos(){
  let pos = Math.random() * 10 - 5;
  return pos;
}

function distance(x1, y1, x2, y2){
  return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}

function drawOneObjectWithNormalMap(obj, mdlMatrix, newViewDir, mvpFromLight, colorR, colorG, colorB){
  
  modelMatrix.setIdentity();
  modelMatrix.multiply(mdlMatrix);

  mvpMatrix.setPerspective(30, 1, 1, 100);
  mvpMatrix.lookAt(cameraX, cameraY, cameraZ,
    cameraX + newViewDir.elements[0],
    cameraY + newViewDir.elements[1],
    cameraZ + newViewDir.elements[2],
    0, 1, 0);
  mvpMatrix.multiply(modelMatrix);

  //normal matrix
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();

  gl.uniform3f(programBump.u_LightPosition, lightX, lightY, lightZ);
  gl.uniform3f(programBump.u_ViewPosition, cameraX, cameraY, cameraZ);
  gl.uniform1f(programBump.u_Ka, 0.2);
  gl.uniform1f(programBump.u_Kd, 0.7);
  gl.uniform1f(programBump.u_Ks, 1.0);
  gl.uniform1f(programBump.u_shininess, 10.0);
  gl.uniform3f(programBump.u_Color, colorR, colorG, colorB);
  gl.uniform1i(programBump.u_Sampler0, 0);


  gl.uniformMatrix4fv(programBump.u_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(programBump.u_modelMatrix, false, modelMatrix.elements);
  gl.uniformMatrix4fv(programBump.u_normalMatrix, false, normalMatrix.elements);
  gl.uniformMatrix4fv(programBump.u_MvpMatrixOfLight, false, mvpFromLight.elements);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, textures[normalMapImg]);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, fbo.texture);
  gl.uniform1i(programBump.u_ShadowMap, 1);

  for( let i=0; i < obj.length; i ++ ){
    initAttributeVariable(gl, programBump.a_Position, obj[i].vertexBuffer);
    initAttributeVariable(gl, programBump.a_Normal, obj[i].normalBuffer);
    initAttributeVariable(gl, programBump.a_TexCoord, obj[i].texCoordBuffer);
    initAttributeVariable(gl, programBump.a_Tagent, obj[i].tagentsBuffer);
    initAttributeVariable(gl, programBump.a_Bitagent, obj[i].bitagentsBuffer);
    initAttributeVariable(gl, programBump.a_crossTexCoord, obj[i].crossTexCoordsBuffer);
    gl.drawArrays(gl.TRIANGLES, 0, obj[i].numVertices);
  }
}

function calculateTangentSpace(position, texcoord){
  //iterate through all triangles
  let tagents = [];
  let bitagents = [];
  let crossTexCoords = [];
  for( let i = 0; i < position.length/9; i++ ){
    let v00 = position[i*9 + 0];
    let v01 = position[i*9 + 1];
    let v02 = position[i*9 + 2];
    let v10 = position[i*9 + 3];
    let v11 = position[i*9 + 4];
    let v12 = position[i*9 + 5];
    let v20 = position[i*9 + 6];
    let v21 = position[i*9 + 7];
    let v22 = position[i*9 + 8];
    let uv00 = texcoord[i*6 + 0];
    let uv01 = texcoord[i*6 + 1];
    let uv10 = texcoord[i*6 + 2];
    let uv11 = texcoord[i*6 + 3];
    let uv20 = texcoord[i*6 + 4];
    let uv21 = texcoord[i*6 + 5];

    let deltaPos10 = v10 - v00;
    let deltaPos11 = v11 - v01;
    let deltaPos12 = v12 - v02;
    let deltaPos20 = v20 - v00;
    let deltaPos21 = v21 - v01;
    let deltaPos22 = v22 - v02;

    let deltaUV10 = uv10 - uv00;
    let deltaUV11 = uv11 - uv01;
    let deltaUV20 = uv20 - uv00;
    let deltaUV21 = uv21 - uv01;

    let r = 1.0 / (deltaUV10 * deltaUV21 - deltaUV11 * deltaUV20);
    for( let j=0; j< 3; j++ ){
      crossTexCoords.push( (deltaUV10 * deltaUV21 - deltaUV11 * deltaUV20) );
    }
    let tangentX = (deltaPos10 * deltaUV21 - deltaPos20 * deltaUV11)*r;
    let tangentY = (deltaPos11 * deltaUV21 - deltaPos21 * deltaUV11)*r;
    let tangentZ = (deltaPos12 * deltaUV21 - deltaPos22 * deltaUV11)*r;
    for( let j = 0; j < 3; j++ ){
      tagents.push(tangentX);
      tagents.push(tangentY);
      tagents.push(tangentZ);
    }
    let bitangentX = (deltaPos20 * deltaUV10 - deltaPos10 * deltaUV20)*r;
    let bitangentY = (deltaPos21 * deltaUV10 - deltaPos11 * deltaUV20)*r;
    let bitangentZ = (deltaPos22 * deltaUV10 - deltaPos12 * deltaUV20)*r;
    for( let j = 0; j < 3; j++ ){
      bitagents.push(bitangentX);
      bitagents.push(bitangentY);
      bitagents.push(bitangentZ);
    }
  }
  let obj = {};
  obj['tagents'] = tagents;
  obj['bitagents'] = bitagents;
  obj['crossTexCoords'] = crossTexCoords;
  return obj;
}

function updateScore() {
  currentScore += 1;
  if(currentScore > bestScore){
    bestScore = currentScore;
  }

  document.getElementById('current-score').innerHTML = "Current Score: " + currentScore;
  document.getElementById('best-score').innerHTML = "  Best Score: " + bestScore;
}

function resetScore(){
  currentScore = 0;
  document.getElementById('current-score').innerHTML = "Current Score: " + currentScore;
}
