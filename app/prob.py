from matplotlib import pyplot as plt
import numpy as np

from matplotlib import cm
import matplotlib.patches as patches

from mpl_toolkits.mplot3d import Axes3D
from scipy.stats import multivariate_normal, norm
import json 

img_size = (1000, 800) # WH

def getTensors(filename):
	f = open(filename)	
	preds = json.load(f)
	print(preds)