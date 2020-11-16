function rect(x, y, w, h, color) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.strokeRect(x, y, w, h);
    ctx.closePath();
}

// clear the canvas
function clear() {
	ctx.fillStyle = "#000000";
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
}

function drawGrid(WIDTH, HEIGHT){
	var step = 10;
	for (var i = 0; i < HEIGHT; i=i+step){
		ctx.beginPath();
		ctx.moveTo(0, i);
		ctx.lineTo(WIDTH, i);
		ctx.strokeStyle = '#e6e6e6';
		ctx.stroke(); 
		ctx.closePath();
	}

	for (var i = 0; i < WIDTH; i=i+step){
		ctx.beginPath();
		ctx.moveTo(i, 0);
		ctx.lineTo(i, HEIGHT);
		ctx.strokeStyle = '#e6e6e6';
		ctx.stroke(); 
		ctx.closePath();
	}
}
//redraw the scene
function draw(){
	//create bounding bbox of different kind
	//@params:
	//opt (int) - type of bbox (0 - gt, 1 - prediction)

	clear();
	drawGrid(WIDTH, HEIGHT);
	rect(0,0,WIDTH,HEIGHT);

	// redraw each rect in the rects[] array
	for (var i = 0; i < rects.length; i++) {
        var r = rects[i];
        rect(r.x, r.y, r.width, r.height, r.stroke);
        if (r.isGT){
        	drawClassLabel(r.x, r.y, r.x + r.width, r.y + r.height, r.gtClass)
    	} else {
    		drawUncertainty(r.x, r.y, r.x + r.width, r.y + r.height, r.covars);
    		if (r.class && r.score){
    			drawScoreLabel(r.x, r.y, r.x + r.width, r.y + r.height, r.score, r.class);
    		}
    	}
    }
}

function createButton(e){
	// tell the browser we're handling this mouse event
    e.preventDefault();
    e.stopPropagation();

     // get the current mouse position
    var mx = parseInt(e.clientX - offsetX);
    var my = parseInt(e.clientY - offsetY);

	    // test each rect to see if mouse is inside
	    for (var i = 0; i < rects.length; i++) {
	        var r = rects[i];
	        if (mx > r.x && mx < r.x + r.width && my > r.y && my < r.y + r.height) {
	            // if yes, set that rects hasButton true

	            if (r.hasButton === false){ //if box does not have a button
		            r.hasButton = true;

		            //Create the button
					var button = document.createElement("button");

					//set button properties
					button.id = "button_edit";
					button.style.left = r.x +'px';
					button.style.top = r.y +  'px';
					button.style.position = 'absolute';

					window.currentEditButton = button;

					//button styling
					button.innerHTML = '<i class = "fa fa-bars"></i>';

					//4. Add event to created button
					var body = document.getElementsByTagName("body")[0];
					body.appendChild(button);

					button.addEventListener ("click", function() {
					
					//if button is clicked, show modification form
					togglePopup(r.isGT);
				})
				break;
			}
	        else {
	        	r.hasButton = false;
	        	window.currentEditButton.remove();
	        }
	    }
	}
}
function updateButton(button, x, y){
	//update modification button coords when changing size
	console.log(x,y,button);
	button.style.left = x + 'px';
	button.style.top = y + 'px';
}

function drawClassLabel(lx, ty, rx, by, classLbl){
	//add ground truth label to bbox
	ctx.font = "30px Arial";
	ctx.fillText(classLbl, rx + 10, ty + 10); 

}

function drawUncertainty(lx, ty, rx, by, covars){

	sigma_left = Math.sqrt(covars[0][0][0]);
	sigma_top = Math.sqrt(covars[0][1][1]);
	sigma_right = Math.sqrt(covars[1][0][0]);
	sigma_bottom = Math.sqrt(covars[1][1][1]);
	
	ctx.beginPath();
	ctx.moveTo(lx - sigma_left, ty);
	ctx.lineTo(lx + sigma_left, ty);
	ctx.strokeStyle = '#8B008B';
	ctx.stroke(); 
	ctx.closePath();

	ctx.beginPath();
	ctx.moveTo(lx, ty - sigma_top);
	ctx.lineTo(lx, ty + sigma_top);
	ctx.strokeStyle = '#8B008B';
	ctx.stroke(); 
	ctx.closePath();

	ctx.beginPath();
	ctx.moveTo(rx - sigma_right, by);
	ctx.lineTo(rx + sigma_right, by);
	ctx.strokeStyle = '#8B008B';
	ctx.stroke(); 
	ctx.closePath();

	ctx.beginPath();
	ctx.moveTo(rx, by - sigma_bottom);
	ctx.lineTo(rx, by + sigma_bottom);
	ctx.strokeStyle = '#8B008B';
	ctx.stroke(); 
	ctx.closePath();
}

function drawScoreLabel(lx, ty, rx, by, prob, lbl){
	ctx.font = "30px Arial";
	ctx.fillText(prob, rx + 10, ty + 10); 
	ctx.fillText(lbl,lx + 10, by -10);
}

function togglePopup(isGT){
	//function to create from for modification
	//@params: isGT - boolean, True if box is ground truth

	div = document.getElementById("popup-1");
	div.classList.toggle("active");
	n_classes = parseInt(document.getElementById('n_classes').value);
	

	if (isGT) {

		//if it is ground truth bbox,some of the fields are hidden (label confidence), but we can set ground truth label
		document.getElementById("label_conf").style.visibility = "hidden";
		document.getElementById("x_left_var").style.visibility = "hidden";
		document.getElementById("y_top_var").style.visibility = "hidden";
		document.getElementById("x_right_var").style.visibility = "hidden";
		document.getElementById("y_bottom_var").style.visibility = "hidden";

		document.getElementById("gt_class").style.visibility = "visible";
		document.getElementById("label_gt_class").style.visibility = "visible";


	} else {
		//if it is prediction bbox, some of the fields are hidden (ground truth class), but we can set class confidences
		document.getElementById("label_conf").style.visibility = "visible";
		document.getElementById("x_left_var").style.visibility = "visible";
		document.getElementById("y_top_var").style.visibility = "visible";
		document.getElementById("x_right_var").style.visibility = "visible";
		document.getElementById("y_bottom_var").style.visibility = "visible";

		document.getElementById("label_gt_class").style.visibility = "hidden";
		document.getElementById("gt_class").style.visibility = "hidden";

		//add input fiels for class and labels, 
		if(div.hasClasses === false){
			for (i = 0; i<n_classes+1; i++){
				var input_class = document.createElement("input");
				input_class.setAttribute("type", "text");
				input_class.id = "class_" + i;
				if (i===0){
					input_class.value = "Obj";
				}
				else{
					input_class.value = i;
				}
				document.getElementById("class_scores_div").appendChild(input_class);
			}
			div.hasClasses = true;
		}
	}

}

