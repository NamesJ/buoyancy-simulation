const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const meters2pixels = 100;

let startTimestamp, previousTimestamp, elapsed;
let maxRunTime = 1e10;//600*1000; // 600 seconds (10 minutes)
let done = false;

const gravity = -10; // gravitational force 

const water_style = 'rgba(20, 10, 230, 0.2)'; // transleucent blue
const water_y = 300/meters2pixels; // 100px from top, infinitely down
const water_p = 10; // base water pressure

const ground_style = 'rgba(150, 70, 20, 1.0)'; // opague dark orange
const ground_y = (canvas.height - 50)/meters2pixels;
const G = 6.67e-11; // N*m^2/kg^2
const earth_mass = 5.9722e24; // kg
const earth_radius = 6.37e6; // meters from center of earth to surface

const cube_style = 'rgba(180, 20, 20, 1.0)'; // opaque red
const cube_mass = 1; // mass (kg)
let cube_len = 1; // 30x30x30 (meter) cube
//let cube_y = water_y + (1.0 + 1.0) * cube_len; // submerged underwater by 4 times it's length
let cube_y = water_y - 1.5 * cube_len; // half-length above water-line
let cube_y_vel = 0.0; // cube y-velocity
let cube_y_vel_terminal = 10000;

let force_gravity = 0;
let force_bouyancy = 0;


// Get the hydrostatic gauge pressure given, base pressure, gravity, and height below water line
function gauge_pressure(p, g, h) {
	return p*g*h;
}

function bouyant_force(p, g, A, h_bottom, h_top) {
	return p*g*A*(h_bottom - h_top);
}

function lerp(v0, v1, amt, maxMove = 0, minDiff = 0.0001) {
	let diff = v1 - v0;
	if (maxMove > 0) {
		diff = Math.min(diff, maxMove);
		diff = Math.max(diff, -maxMove);
	}
	if (Math.abs(diff) < minDiff) {
		return v1;
	}
	return v0 + diff * amt;
};

function update(delta) {
	// lerp cube length between 100 and 1 over 10 seconds
	//cube_len = lerp(100, 10, Math.min(elapsed / 10000, 1.0));
	const t = elapsed / 1000;
	cube_len = 0.8 + 0.6*Math.sin(t*0.2+Math.PI/2);
	
	const dSeconds = delta / 1000;
	force_gravity = 0;
	force_bouyancy = 0;
	// above the ground
	if (cube_y + cube_len / 2 < ground_y || true) {
		force_gravity = G * cube_mass * earth_mass / ((cube_y + cube_len / 2) - ground_y + earth_radius)**2;
	}
	// in water
	const bottom_to_water = water_y - (cube_y + cube_len / 2)
	const top_to_water = water_y - (cube_y - cube_len / 2)
	if (bottom_to_water < 0) {
		// partially submerged
		if (top_to_water < 0) {
			force_bouyancy = water_p * gravity * cube_len**3; // height diff between top and bottom always -1 * cube_len
		} 
		// fully submerged
		else {
			force_bouyancy = water_p * gravity * (cube_len**2*(cube_len-top_to_water)); // height diff between top and bottom always -1 * cube_len
		}
		
	}
	const net_force = force_gravity + force_bouyancy;
	cube_y_vel += net_force * dSeconds; // apply force over the dSeconds chunk of time
	if (cube_y_vel > cube_y_vel_terminal) {
		cube_y_vel = cube_y_vel_terminal;
	}
	cube_y_vel *= .8;
	cube_y += cube_y_vel * dSeconds; // apply velocity over the dSeconds chunk of time
	if (cube_y + cube_len / 2 >= ground_y) {
		cube_y = ground_y - cube_len / 2;
	}
}

function draw() {
	// clear canvas
	ctx.clearRect(0, 0, canvas.width, canvas.height)

	// draw cube
	ctx.strokeStyle = null;
	const x = canvas.width / 2 - (cube_len / 2)*meters2pixels;
	const y = (cube_y - cube_len / 2)*meters2pixels;
	ctx.beginPath();
	ctx.rect(x, y, cube_len*meters2pixels, cube_len*meters2pixels);
	ctx.fillStyle = cube_style;
	ctx.fill();
	// draw cube density text
	//ctx.font = (36*cube_len).toString() + ' serif';
	ctx.font = '24px serif';
	let cube_density = cube_mass / cube_len**3;
	cube_density = Math.trunc(cube_density*10**4)/10**4
	ctx.fillText('Density = ' + cube_density.toString(), x, y);
	
	

	// draw water
	ctx.beginPath();
	ctx.rect(0, water_y*meters2pixels, canvas.width, canvas.height-water_y);
	ctx.fillStyle = water_style;
	ctx.fill();
	
	// draw ground
	ctx.beginPath();
	ctx.rect(0, ground_y*meters2pixels, canvas.width, canvas.height-ground_y);
	ctx.fillStyle = ground_style;
	ctx.fill();
	
	// Draw force vectors
	const center_x = canvas.width / 2;
	const center_y = cube_y*meters2pixels;
	const vector_scale = meters2pixels/25;
	// Draw gravity force vector
	ctx.strokeStyle = '#00ff00';
	ctx.beginPath();
	ctx.moveTo(center_x, center_y);
	ctx.lineTo(center_x, center_y + force_gravity*vector_scale);
	ctx.stroke();
	ctx.closePath();
	// Draw bouyancy force vector
	ctx.strokeStyle = '#0000ff';
	ctx.beginPath();
	ctx.moveTo(center_x, center_y);
	ctx.lineTo(center_x, center_y + force_bouyancy*vector_scale);
	ctx.stroke();
	ctx.closePath();
}

function step(timestamp) {
	if (startTimestamp === undefined) {
		startTimestamp = timestamp;
		previousTimestamp = timestamp;
	}
	elapsed = timestamp - startTimestamp;
	const delta = timestamp - previousTimestamp;
	
	update(delta);
	draw();

	if (elapsed < maxRunTime) {
		previousTimestamp = timestamp;
		window.requestAnimationFrame(step);
	} else {
		done = true;
	}
}

function start() {
	window.requestAnimationFrame(step);
}

start();
