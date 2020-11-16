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


	//get GT and Preds in the format suitable for PDQ-evaluation
	dicts = createDicts(rect_gts, rect_preds); //return dicts
	gt_dict = dicts[0]; 
	pred_dict = dicts[1];

	//FLASK 
	fetch(`${window.origin}/index/pass_val`,{
		method: 'POST',
		credentials: 'include',
		body: JSON.stringify([gt_dict, pred_dict, methodOpt, n_classes + 1]), //we pass gt, preds, method option and number of classes to python script
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