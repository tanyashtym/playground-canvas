//GLOBAL variables
var gt_id = 0; //needed to assign unique id to ground truth bbox
var pred_id = 0; //needed to assign unique id to prediction bbox

var rects = []; //to keep all bboxes from canvas
var rect_gts = [];//to keep all ground truth bboxes from canvas
var rect_preds = [];//to keep all prediction bboxes from canvas

var n_classes = parseInt(document.getElementById('n_classes').value); //number of classes
var all_classes = ['none', 'car', 'bus', 'person']; //all classes

//get canvas related references
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext("2d"); 
var BB = canvas.getBoundingClientRect();
var offsetX = BB.left;
var offsetY = BB.top;
var WIDTH = canvas.width;
var HEIGHT = canvas.height;

//drag related variables, http://jsfiddle.net/m1erickson/qm9Eb/
var dragok = false;
var startX;
var startY;

//listen for mouse events
canvas.onmousedown = mouseDown;
canvas.onmouseup = mouseUp;
canvas.onmousemove = mouseMove;

//listen to click events
canvas.onclick = createButton;

//get id of popup form and add flag for classes
div = document.getElementById("popup-1");
div.hasClasses = false;

//draw();

//add bbox to list of rectangles
function createBbox(opt){
	//create bounding bbox of different kind
	//@params:
	//opt (int) - type of bbox (0 - gt, 1 - prediction)

    var n_classes = parseInt(document.getElementById('n_classes').value); //number of classes

	var box = {
		x: 75,
		y: 50,
		width: 100,
		height: 100,
		isDragging: false,
		hasButton: false,
        
	}	

	if (opt === 0){
		box.stroke = "#009933";
		box.id = gt_id;
		box.isGT = true;
        box.gtClass = 1;
		rect_gts.push(box);
		gt_id = gt_id + 1;
		rects.push(box);

	}
	if (opt === 1) {
		box.stroke = "#ff3300";
		box.id = pred_id;
		box.isGT = false;
        box.covars = [[[100, 0], [0, 100]], [[100, 0], [0, 100]]];
		rect_preds.push(box);
		pred_id = pred_id + 1;
        box.confidences = [] //add class confidences + obj score (0.2)
        box.confidences.push(0.2)
        for(var i = 0; i < n_classes; i++){
            box.confidences.push(0.8/n_classes);
        }
		rects.push(box);
	}
	//call to draw the scene
	draw();
}

//handle mousedown events
function mouseDown(e) {


    // tell the browser we're handling this mouse event
    e.preventDefault();
    e.stopPropagation();

    // get the current mouse position
    var mx = parseInt(e.clientX - offsetX);
    var my = parseInt(e.clientY - offsetY);

    // test each rect to see if mouse is inside
    dragok = false;
    for (var i = 0; i < rects.length; i++) {
    	
        var r = rects[i];
        if (mx > r.x && mx < r.x + r.width && my > r.y && my < r.y + r.height) {
            // if yes, set that rects isDragging=true
            dragok = true;
            r.isDragging = true;
            break;
        }
    }
    // save the current mouse position
    startX = mx;
    startY = my;
}

// handle mouseup events
function mouseUp(e) {  
    // tell the browser we're handling this mouse event
    e.preventDefault();
    e.stopPropagation();

    // clear all the dragging flags
    dragok = false;
    for (var i = 0; i < rects.length; i++) {
        rects[i].isDragging = false;
        r = rects[i];
         //when move, we do not need button
        if(r.hasButton){
            r.hasButton = false;
        	window.currentEditButton.remove();
        }
    }
}


//handle mousemove events
function mouseMove(e) {
    // if we're dragging anything...
    if (dragok) {

        // tell the browser we're handling this mouse event
        e.preventDefault();
        e.stopPropagation();

        // get the current mouse position
        var mx = parseInt(e.clientX - offsetX);
        var my = parseInt(e.clientY - offsetY);

        // calculate the distance the mouse has moved
        // since the last mousemove
        var dx = mx - startX;
        var dy = my - startY;

        // move each rect that isDragging 
        // by the distance the mouse has moved
        // since the last mousemove
        for (var i = 0; i < rects.length; i++) {
            var r = rects[i];

            //when move, we do not need button
            if(r.hasButton){
            	r.hasButton = false;
        		window.currentEditButton.remove();
            }
            if (r.isDragging) {
                r.x += dx;
                r.y += dy;

            }
        }

        // redraw the scene with the new rect positions
        draw();

        // reset the starting mouse position for the next mousemove
        startX = mx;
        startY = my;

    }
}

function closePopup(){
	div = document.getElementById("popup-1");

	if(div.hasClasses){
		for (i = 0; i < n_classes + 1; i++){
			id_val =  "class_" + i;
			var class_input = document.getElementById(id_val);
			class_input.remove();
			div.hasClasses = false;
		}
	}
	
	div.classList.toggle("active");
}


function modifyParameters(e){
    // get the current button coordinates for editing
    var button = document.getElementById("button_edit");
    lx = parseInt(button.style.left.replace('px',''));
    ty =  parseInt(button.style.top.replace('px',''));

    //get bbox for which modifications apply
    var bbox;
    for (var i = 0; i < rects.length; i++) {
        
        var r = rects[i];
        if (lx >= r.x && lx <= r.x + r.width && ty >= r.y && ty <= r.y + r.height && r.hasButton) {
            // if yes, set that rects isDragging=true
            bbox = r;
            break;
        }
    }
    
    //get information about bbox assigned to the form
    var x_left = parseFloat(document.forms["form_edit"]["x_left_bbox"].value);
    var y_top = parseFloat(document.forms["form_edit"]["y_top_bbox"].value);
    var x_right = parseFloat(document.forms["form_edit"]["x_right_bbox"].value);
    var y_bottom = parseFloat(document.forms["form_edit"]["y_bottom_bbox"].value);
    

    bbox.x = x_left;
    bbox.y = y_top;
    bbox.width = x_right - x_left;
    bbox.height = y_bottom - y_top;


    if (bbox.isGT === true){
    //additional information for ground truth bbox
        var class_gt = parseInt(document.forms["form_edit"]["gt_class"].value);
        bbox.gtClass = class_gt;
        //drawClassLabel(x_left,y_top,x_right, y_bottom, class_gt);
    }else{
        //get maximum probability and index of maximum probability in order to get class name   
        var maxProb = -1;
        var maxIdx = -1;
        var classProbs = [];
        //additional information for detection bbox
        var sigma_left_top = [];
        var sigma_right_bottom = [];

        //get uncertainties values
        var sigma_left = parseFloat(document.forms["form_edit"]["x_left_var"].value);
        var sigma_top = parseFloat(document.forms["form_edit"]["y_top_var"].value);
        var sigma_right = parseFloat(document.forms["form_edit"]["x_right_var"].value);
        var sigma_bottom = parseFloat(document.forms["form_edit"]["y_bottom_var"].value);

        sigma_left_top = [[sigma_left*sigma_left, 0],[0, sigma_top*sigma_top]];
        sigma_right_bottom = [[sigma_right * sigma_right, 0], [0, sigma_bottom*sigma_bottom]];
        bbox.covars = [sigma_left_top, sigma_right_bottom];

        //get classes information and find maximum
        for (i = 0; i < n_classes + 1; i++){
            prob = parseFloat(document.forms["form_edit"]["class_" + i].value);
            classProbs.push(prob);

            if(prob > maxProb){
                maxProb = prob;
                maxIdx = i;
            }
        }
        bbox.confidences = classProbs;
        bbox.score = maxProb;
        bbox.class = all_classes[maxIdx];
    }
    draw();
    updateButton(button, x_left, y_top);
}

function evaluateMethod(opt){
    var n_classes = parseInt(document.getElementById('n_classes').value); //number of classes
    //pass to Python
    pass_values(opt,n_classes);
    
    //create divs for mAP and PDQ
    var mAP = document.createElement('div');
    mAP.id = "mAP";
    var div = document.getElementById("resultsSection");
    div.appendChild(mAP);

    var pdq = document.createElement('div');
    pdq.id = "pdq";
    var div = document.getElementById("resultsSection");
    div.appendChild(pdq);

    //drawProbabilityTensors();
    draw();

}

async function vizualizeUncertainty(){
    var n_classes = parseInt(document.getElementById('n_classes').value); //number of classes
    await pass_values_uncertainty(0, n_classes);
    await getProbTensors();

    //draw();
}

async function importFile(){
    await getBboxFromJSON();
    draw();
}