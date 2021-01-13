from matplotlib import pyplot as plt
import numpy as np

from matplotlib import cm
import matplotlib.patches as patches

from mpl_toolkits.mplot3d import Axes3D
from scipy.stats import multivariate_normal, norm
import json 
import time

def getTensors():
	filename = "pred.json"
	f = open(filename)
	preds = json.load(f)
	img_size = (1000, 800) # WH
	prob_tensor = get_prob_tensor(preds, img_size, n = 2)

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

def get_prob_tensor(preds, img_size, n = 1):
    """
    Inputs:
        preds (json) - input json of predictions (detections)
        img_size (tuple) - the size of the image
        n (int) - over how many pixels a probability is found.
    """
    
    nr_dets = len(preds["detections"][0])
    prob_tensor = np.zeros(shape=[img_size[1], img_size[0], nr_dets])

    X = np.linspace(0, img_size[0], img_size[0]//n)
    Y = np.linspace(0, img_size[1], img_size[1]//n)
    XY = np.meshgrid(X, Y)

    for i, det in enumerate(preds["detections"][0]):
        bbox = det["bbox"]
        covars = det["covars"]

        if (covars != [[[0, 0], [0, 0]], [[0, 0], [0, 0]]]):

            bbox_c = bbox.copy()
            bbox_c[1] = img_size[1] - bbox[1]
            bbox_c[3] = img_size[1] - bbox[3]
            
            bbox_c[1] = img_size[1] - bbox[1]  # Invert y-axis
            bbox_c[3] = img_size[1] - bbox[3]
            # Padding of bbox based on covariance
            bbox_pad = np.array([-np.sqrt(covars)[0][0][0], np.sqrt(covars)[0][1][1], np.sqrt(covars)[1][0][0], -np.sqrt(covars)[1][1][1]])*2
            bbox_padded = np.array((bbox_c + bbox_pad), dtype=np.int)
            
            if (bbox_padded[2]-bbox_padded[0]) % n != 0 or (bbox_padded[1]-bbox_padded[3]) % n != 0:
                print("The image size is not divisible by n, use n = 1 instead")
                n = 1

            # Check if padding is inside of the bounds
            bbox_padded = [max(0, bbox_padded[0]), min(img_size[1], bbox_padded[1]), min(img_size[0], bbox_padded[2]), max(0, bbox_padded[3])]
                
            X = np.linspace(bbox_padded[0], bbox_padded[2], (bbox_padded[2]-bbox_padded[0])//n)
            Y = np.linspace(bbox_padded[1], bbox_padded[3], (bbox_padded[1]-bbox_padded[3])//n)
            XY = np.meshgrid(X, Y)

            print(bbox_c)
            print(bbox_padded)

            F1 = multivariate_normal(bbox_c[:2], covars[0])
            F2 = multivariate_normal(bbox_c[2:], covars[1])
            
            
            start_time = time.time()
            probs = np.reshape(prob_point_in_bbox(XY, F1, F2), XY[0].shape)
            #probs = np.flip(np.reshape(prob_point_in_bbox(XY, F1, F2), XY[0].shape), axis=0)
            # Repeat each element n-times
            probs = np.repeat(probs, n, axis=0)
            probs = np.repeat(probs, n, axis=1)

            prob_tensor[(img_size[1] - bbox_padded[1]):(img_size[1] - bbox_padded[3]), bbox_padded[0]:bbox_padded[2], i] = probs
            
            print("Time taken:", time.time() - start_time)
            
    return prob_tensor



