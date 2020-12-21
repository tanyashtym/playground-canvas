from matplotlib import pyplot as plt
import numpy as np

from matplotlib import cm
import matplotlib.patches as patches

from mpl_toolkits.mplot3d import Axes3D
from scipy.stats import multivariate_normal, norm
import json 

def getTensors():
	filename = "pred.json"
	f = open(filename)
	preds = json.load(f)
	img_size = (1000, 800) # WH
	prob_tensor = get_prob_tensor(preds, img_size, n = 1)

	#Probability of nothing = (1 - b1_prob)(1 - b2_prob)... 
	#Normalize by prob of none - sum all the probabilities together (multiplied by probability vectors) 
	#and then normalize it by (1-p_none)

	p_none = np.product((1 - prob_tensor), axis=2)
	p_other = 1 - p_none
	p_norm = np.sum(prob_tensor, axis=2)

	# Where comes in objectness?

	nr_classes = len(preds["detections"][0][0]["label_probs"])
	p_classwise = np.zeros(shape=(*p_none.shape, nr_classes+1))

	# Fill in all the class probabilities
	for i, det in enumerate(preds["detections"][0]):
	    probs_class = det["label_probs"]
	    
	    for j, p in enumerate(probs_class):  # Make this better
	        p_classwise[:, :, j] += prob_tensor[:, :, i]*p  # For detection_i, add probabilities for class_j

	# Add p_none
	p_classwise[:, :, -1] = p_none
	        
	# Normalize the probs
	for i in range(p_classwise.shape[-1] - 1): # No need to normalize p_none
	    p_classwise[:,:,i] = p_classwise[:,:,i]*p_other/(p_norm + 1e-24)
	
	return prob_tensor

def prob_point_in_bbox(XY, F1, F2, is_in = True):
    
    X_flatten = XY[0].flatten()
    Y_flatten = XY[1].flatten()

    infs = np.repeat(np.inf, len(X_flatten))
    coords = np.array([X_flatten, infs]).T
    coords2 = np.array([infs, Y_flatten]).T
    coords_point = np.array([X_flatten, Y_flatten]).T

    
    probs = (F1.cdf(coords)  - F1.cdf(coords_point))*(F2.cdf(coords2)  - F2.cdf(coords_point))

    if is_in:
        return probs
    else:
        return 1 - probs

def get_prob_tensor(preds, img_size, n = 1): # Slow.., need to make it faster,
    
    nr_dets = len(preds["detections"][0])
    prob_tensor = np.zeros(shape=[img_size[1]//n, img_size[0]//n, nr_dets])

    X = np.linspace(0, img_size[0], img_size[0]//n)
    Y = np.linspace(0, img_size[1], img_size[1]//n)  # Atm works only for square
    XY = np.meshgrid(X, Y)
    
    for i, det in enumerate(preds["detections"][0]):
        bbox = det["bbox"]
        covars = det["covars"]
        bbox_c = bbox.copy()

        bbox_c[1] = img_size[1] - bbox[1]
        bbox_c[3] = img_size[1] - bbox[3]
        print(bbox_c)
        
        F1 = multivariate_normal(bbox_c[:2], covars[0])
        F2 = multivariate_normal(bbox_c[2:], covars[1])
        prob_tensor[:, :, i] = np.flip(np.reshape(prob_point_in_bbox(XY, F1, F2), XY[0].shape), axis=0)
        
    return prob_tensor



