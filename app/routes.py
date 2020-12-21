from app import app

import sys
sys.path.insert(0,'./ptq/')

from app.forms import ThreshForm
from flask import render_template, flash, redirect, request, jsonify, make_response
import json
import ptq.evaluate as evaluate
import ptq.prob as prob
import numpy as np


@app.route('/')
@app.route('/index',methods = ['GET','POST'])


def index():
	form = ThreshForm()
	return render_template('index.html', form = form)

@app.route('/index/pass_val',methods=['POST'])

def pass_val():

	req = request.get_json()


	gt = req[0]
	pred = req[1]
	method = req[2]

	n_classes = req[3]

	flagUncertainty = req[4]
	
	with open("gt.json", "w") as outfile:
		json.dump(gt, outfile)
	with open("pred.json", "w") as outfile:
		json.dump(pred, outfile)


	results = evaluate.main(method,n_classes)
	res = make_response(jsonify(results))
	

	if flagUncertainty == 0:
		print(flagUncertainty)
		tensors = prob.getTensors()
		for i in range(tensors.shape[2]):
			np.savetxt("app/static/js/det" + str(i) + ".txt", np.matrix(tensors[:,:,i]), fmt = '%.2f')

	return res
