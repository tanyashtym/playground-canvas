function createSegmentation(lx,ty,rx,by){
	segmentation = [];
	for (var i = lx; i < rx; i++){
		for (var j = ty; j < by; j++){
			segmentation.push(i);
			segmentation.push(j);

		}
	}
	return segmentation;
}

function createDicts(rect_gts, rect_preds) {
	//creates files suitable for PDQ evaluation script
	//return: dictionaries of ground truths and predictions in sutiable for evaluation format

	//get n_classes
	var n_classes = parseInt(document.getElementById('n_classes').value);
	//get ground truths
	anno = [];
	for (var i = 0; i < rect_gts.length; i++){
		r = rect_gts[i];
		coords = [r.x, r.y, r.width, r.height];
		segm = createSegmentation(r.x, r.y, r.x+r.width, r.y + r.height);

		var a = {
			"segmentation": [segm],
			"bbox": coords,
			"category_id": parseInt(r.gtClass), //add class of the object
			"ignore": 0,
			"iscrowd": 0,
			"id": i,
			"image_id": 1,
			"area": 0

		};
		anno.push(a);
	}

	classes = {
		1: [{"supercategory": "none", "name": "none", "id": 0}, {"supercategory": "none", "name": "car", "id": 1}],
		2: [{"supercategory": "none", "name": "none", "id": 0}, {"supercategory": "none", "name": "car", "id": 1},{"supercategory": "none", "name": "bus", "id": 2}],
		3: [{"supercategory": "none", "name": "none", "id": 0}, {"supercategory": "none", "name": "car", "id": 1}, {"supercategory": "none", "name": "bus", "id": 2}, {"supercategory": "none", "name": "person", "id": 3}]

	};

	//create final dictionary with ground-truth bboxes
	var gt = {
		images: [{"width": 1000, "height": 800, "file_name": "1.jpg", "id": 1}], //we assume that we have just only ONE image
		annotations: anno,
		categories:  classes[n_classes]
	};

	anno = [];
	cl_prob = [];
	for (i = 0; i < 4 - n_classes; i++){
		cl_prob.push(0);
	}

	for (var i = 0; i < rect_preds.length; i++){
		r = rect_preds[i];
		coords = [r.x, r.y, r.x+r.width, r.y+r.height];

		var a = {
			"bbox": coords,
			"covars": r.covars,
			"label_probs": r.confidences
		};
		anno.push(a);
	}

	//create final dictionary with prediction bboxes
	var pred = {
		"classes": ['none','car','bus','person'],
		"detections": [anno]
	};

	return [gt, pred];
}

function pass_values(methodOpt,n_classes) {
	//function that "connects" JS and Python
	//@params: methodOpt -  which method to use: (0 - mAP, 1 - PDQ, 2 - our method)
	//		   n_classes - number of classes

	//window.location.reload(true);
	//get GT and Preds in the format suitable for PDQ-evaluation
	dicts = createDicts(rect_gts, rect_preds); //return dicts
	gt_dict = dicts[0]; 
	pred_dict = dicts[1];

	//FLASK 
	fetch(`${window.origin}/index/pass_val`,{
		method: 'POST',
		credentials: 'include',
		body: JSON.stringify([gt_dict, pred_dict, methodOpt, n_classes + 1, 1]), //we pass gt, preds, method option and number of classes to python script
		cache: 'no-cache',
		headers: new Headers({
			"content-type": 'application/json'
		})
	})

	//get results from Python script
	.then(function(response) {
		if (response.status !== 200){
			console.log("Response status was not 200 : ${response.status}:");
			return;
		}
		//vizualize results for mAP
		response.json().then(function (data) {
			if (typeof(data) === 'number'){
				mAP = document.getElementById('mAP');
				mAP.innerHTML = "mAP = " + data;
			}
			//vizualize results for PDQ
			else {
				var pdq = document.getElementById('pdq');
				pdq.innerHTML = "PDQ = " + data.PDQ + "<br />" + "Spatial quality = " + data.avg_spatial + "<br />" + "Label quality = " + data.avg_label + "<br />" + "Background Loss = " + data.avg_bg + "<br />" + "Foreground Loss = " + data.avg_fg + "<br />" + "TP = " + data.TP + "<br />" + "FP = " + data.FP + "<br />" + "FN = " + data.FN;
			}

		});
	});

}

//CHANGE THIS TO STH!

async function pass_values_uncertainty(methodOpt,n_classes) {
	//function that "connects" JS and Python
	//@params: methodOpt -  which method to use: (0 - mAP, 1 - PDQ, 2 - our method)
	//		   n_classes - number of classes

	//window.location.reload(true);
	//get GT and Preds in the format suitable for PDQ-evaluation
	dicts = createDicts(rect_gts, rect_preds); //return dicts
	gt_dict = dicts[0]; 
	pred_dict = dicts[1];

	//FLASK 
	return fetch(`${window.origin}/index/pass_val`,{
		method: 'POST',
		credentials: 'include',
		body: JSON.stringify([gt_dict, pred_dict, methodOpt, n_classes + 1, 0]), //we pass gt, preds, method option and number of classes to python script
		cache: 'no-cache',
		headers: new Headers({
			"content-type": 'application/json'
		})
	})

	//getProbTensors();
}

async function getProbTensors(){
	for (var i=0; i < rect_preds.length; i++){
		//console.log("I ========== ", i);
        filename = 'static/js/'.concat('det'.concat(i.toString().concat('.txt')));
        probs = [];
        console.log(filename);

        let data = await fetchTextData(filename);//.then(arr => console.log(arr));
        console.log("ok data", filename);
        lines = data.split('\n');

        for (var line=0; line<lines.length - 1; line++){
            probStrings = lines[line].split(' ');
            probInts = [];
            for (var p = 0; p < probStrings.length; p++){
                probInts.push(parseFloat(probStrings[p]));
            }
            
            probs.push(probInts);

        }
        drawProbabilityTensors(probs);
        rect_preds[i].probs = probs; 
        //console.log(rect_preds[i].probs)
      }
      console.log("OK RETURN");
      return;
}

function fetchTextData(filename){
return fetch(filename, {cache: 'no-cache'})
          .then(response => response.text())
}


function GTfromJSON(data){
	annotations = data['annotations']; //array of dictionaries
	for (var i = 0; i < annotations.length; i = i + 1){
		//segmentation = annotations[i]['segmentation'];
		bbox = annotations[i]['bbox'];
		category = annotations[i]['category_id'];

		var box = {
			x: bbox[0],
			y: bbox[1],
			width: bbox[2],
			height: bbox[3],
			stroke: "#009933",
			gtClass: category,
			isGT: true,
			id: i,
			hasButton: false,
			isDragging: false
		}

		rect_gts.push(box);
		rects.push(box);
	}
}

function predFromJSON(data){

	detections = data['detections'][0];
	for (var i = 0; i < detections.length; i = i + 1){
		bbox = detections[i]['bbox'];
		cvar = detections[i]['covars'];
		label_probs = detections[i]['label_probs'];

		var box = {
			x: bbox[0],
			y: bbox[1],
			width: bbox[2] - bbox[0],
			height: bbox[3] - bbox[1],
			stroke: "#ff3300",
			isGT: false,
			covars: cvar,
			confidences: label_probs,
			id: i,
			hasButton: false,
			isDragging: false
		}
		rect_preds.push(box);
		rects.push(box);

	}
}



async function getBboxFromJSON(){
	files = ['static/json/gt.json', 'static/json/pred.json'];
	for (var i = 0; i < files.length; i=i+1){
		console.log(rects);
		// 1 - GT objects, 2 - predictions (RVC1)
		let data = await fetchJSONdata(files[i]);
		if(i === 0) { //if GT
			GTfromJSON(data);
		}
		else { //if predictions
			predFromJSON(data);
		}
	}
}

function fetchJSONdata(filename){
return fetch(filename, {cache: 'no-cache'})
          .then(response => response.json())
}
