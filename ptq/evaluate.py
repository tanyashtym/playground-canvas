import read_files
import argparse
import os
import sys
from pdq import PDQ
from coco_mAP import coco_mAP
import json
import numpy as np
import rvc1_gt_loader
import rvc1_submission_loader
#from coco_LRP import coco_LRP

if (open('gt.json')):
    coco_gt_file = json.load(open('gt.json'))

class ParamSequenceHolder:
    def __init__(self, gt_instances_lists, det_instances_lists):
        """
        Class for holding parameters (GroundTruthInstances etc.) for multiple sequences.
        Based upon match_sequences function from codalab challenge but with fewer checks.
        Link to codalab challenge version: https://github.com/jskinn/rvchallenge-evaluation/blob/master/gt_loader.py
        :param gt_instances_lists: list of gt_instance_lists (one gt_instance_list per sequence)
        :param det_instances_lists: list of det_instance_lists (one det_instance_list per sequence)
        Note, order of gt_instances_list and det_instances_list must be the same (corresponding sequences)

        """
        self._gt_instances_lists = gt_instances_lists
        self._det_instances_lists = det_instances_lists

        #print("self.gt = ", self._gt_instances_lists)

    def __len__(self):
        length = np.sum([len(gt_list) for gt_list in self._gt_instances_lists])
        return length

    def __iter__(self):
        for idx in range(len(self._gt_instances_lists)):
            gt_list = self._gt_instances_lists[idx]
            det_list = self._det_instances_lists[idx]
            #print("gt_list = ", gt_list)
            # Check the lists are the same length
            if len(gt_list) != len(det_list):
                raise ValueError('gt_list and det_list for sequence {0} not the same length\n'
                                 'length GT: {1}\n'
                                 'length Det {2}'.format(idx, len(gt_list), len(det_list)))

            for frame_gt, frame_detections in zip(gt_list, det_list):
                #print("frame_gt = ", frame_gt,frame_detections)
                ground_truth = list(frame_gt)
                #print("ground_truth= ", ground_truth)
                detections = list(frame_detections)
                #print("detections = ", detections)
                yield ground_truth, detections


def gen_param_sequence():
    """
    Function for generating the parameter sequence to be used in evaluation procedure.
    Parameter sequence holds all GroundTruthInstances, DetectionInstances, and ground-truth filter flags
    across all sequences.
    :return: param_sequences: ParamSequenceHolder containing all GroundTruthInstances, DetectionInstances,
    and ground-truth filter flags across all sequences being evaluated.
    len_sequences: list of sequence lengths for all sequences being evaluated.
    """

    # Load GTs and Detections as appropriate for different data sets (multiple sequences or one folder)
    #if args.test_set == 'coco':
    # output is a generator of lists of GTInstance objects and a map of gt_class_ids
    
    
    coco_gt_file = 'gt.json'
    det_loc = 'pred.json'
    
    gt_instances, gt_class_ids = read_files.read_COCO_gt(coco_gt_file, ret_classes=True, bbox_gt=True)
    det_filename = det_loc

    # output is a generator of lists of DetectionInstance objects (BBox or PBox depending on detection)
    det_instances = read_files.read_pbox_json(det_filename, gt_class_ids,
                                                  prob_seg=False)
    all_gt_instances = [gt_instances]
    all_det_instances = [det_instances]

    #print("all_gt = ", all_gt_instances[0], all_det_instances)
    param_sequence = ParamSequenceHolder(all_gt_instances, all_det_instances)
    len_sequences = [len(all_gt_instances[idx]) for idx in range(len(all_gt_instances))]

    return param_sequence, len_sequences


def main(method, n_classes):


    if (method == 1):
        print("Extracting GT and Detections")
        param_sequence, len_sequences = gen_param_sequence()

        print("Calculating PDQ")

        # Get summary statistics (PDQ, avg_qualities)
        evaluator = PDQ(filter_gts=True, segment_mode=False, greedy_mode=False)
        pdq = evaluator.score(param_sequence)
        TP, FP, FN = evaluator.get_assignment_counts()
        avg_spatial_quality = evaluator.get_avg_spatial_score()
        avg_label_quality = evaluator.get_avg_label_score()
        avg_overall_quality = evaluator.get_avg_overall_quality_score()
        avg_fg_quality = evaluator.get_avg_fg_quality_score()
        avg_bg_quality = evaluator.get_avg_bg_quality_score()

        # Get the detection-wise and ground-truth-wise qualities and matches for PDQ and save them to file
        all_gt_eval_dicts = evaluator._gt_evals
        all_det_eval_dicts = evaluator._det_evals

        result = {"PDQ": pdq, "avg_pPDQ": avg_overall_quality, "avg_spatial": avg_spatial_quality,
              'avg_fg': avg_fg_quality, 'avg_bg': avg_bg_quality,
              "avg_label": avg_label_quality, "TP": TP, "FP": FP, "FN": FN}

        return result;


    #Calculate mAP
    if (method == 0):
        print("Calculating mAP")
        #print("Extracting GT and Detections")
        param_sequence, len_sequences = gen_param_sequence()     
        mAP = coco_mAP(param_sequence, n_classes, use_heatmap=False)
        #print("MAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP ", mAP)
        return mAP

    
    # Compile evaluation statistics into a single dictionary
    result = {"PDQ": pdq, "avg_pPDQ": avg_overall_quality, "avg_spatial": avg_spatial_quality,
              'avg_fg': avg_fg_quality, 'avg_bg': avg_bg_quality,
              "avg_label": avg_label_quality, "TP": TP, "FP": FP, "FN": FN, 'mAP': mAP}
    # print("PDQ: {0:4f}\n"
    #       "mAP: {1:4f}\n"
    #       "avg_pPDQ:{2:4f}\n"
    #       "avg_spatial:{3:4f}\n"
    #       "avg_label:{4:4f}\n"
    #       "avg_foreground:{5:4f}\n"
    #       "avg_background:{6:4f}\n"
    #       "TP:{7}\nFP:{8}\nFN:{9}\n".format(pdq, mAP, avg_overall_quality, avg_spatial_quality,
    #                                  avg_label_quality, avg_fg_quality, avg_bg_quality, TP, FP, FN))

    # # # Save evaluation statistics to file
    # with open(os.path.join('/home/tetiana/playground-flask/', 'scores.txt'), 'w') as output_file:
    #     output_file.write("\n".join("{0}:{1}".format(k, v) for k, v in sorted(result.items())))


if __name__ == '__main__':
    main()
