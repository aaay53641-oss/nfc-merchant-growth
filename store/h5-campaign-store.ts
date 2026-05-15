"use client";

import { create } from "zustand";
import type { GeneratedCopy, H5Reward, H5Task, Submission, SubmitTaskType, TaskStatus } from "@/lib/h5/types";

const initialTaskStatus: Record<H5Task["id"], TaskStatus> = {
  l1: "AVAILABLE",
  l2: "LOCKED",
  l3: "LOCKED",
};

function unlockNextTask(statuses: Record<H5Task["id"], TaskStatus>, taskId: H5Task["id"]) {
  if (taskId === "l1" && statuses.l2 === "LOCKED") statuses.l2 = "AVAILABLE";
  if (taskId === "l2" && statuses.l3 === "LOCKED") statuses.l3 = "AVAILABLE";
}

export function taskTypeToTaskId(taskType: SubmitTaskType): H5Task["id"] {
  if (taskType === "l2-photo" || taskType === "l2-review") return "l2";
  return "l3";
}

interface H5CampaignState {
  taskStatus: Record<H5Task["id"], TaskStatus>;
  submissions: Submission[];
  generatedCopies: GeneratedCopy[];
  claimedRewards: Partial<Record<H5Reward["id"], string>>;
  setTaskStatus: (taskId: H5Task["id"], status: TaskStatus) => void;
  approveTask: (taskId: H5Task["id"]) => void;
  addSubmission: (submission: Submission) => void;
  approveSubmission: (submissionId: string) => void;
  addGeneratedCopies: (copies: GeneratedCopy[]) => void;
  claimReward: (campaignId: string, rewardId: H5Reward["id"]) => string;
}

export const useH5CampaignStore = create<H5CampaignState>((set, get) => ({
  taskStatus: initialTaskStatus,
  submissions: [],
  generatedCopies: [],
  claimedRewards: {},
  setTaskStatus: (taskId, status) =>
    set((state) => {
      const next = { ...state.taskStatus, [taskId]: status };
      if (status === "APPROVED") unlockNextTask(next, taskId);
      return { taskStatus: next };
    }),
  approveTask: (taskId) =>
    set((state) => {
      const next = { ...state.taskStatus, [taskId]: "APPROVED" as TaskStatus };
      unlockNextTask(next, taskId);
      return { taskStatus: next };
    }),
  addSubmission: (submission) =>
    set((state) => {
      const taskId = taskTypeToTaskId(submission.taskType);
      return {
        submissions: [submission, ...state.submissions],
        taskStatus: { ...state.taskStatus, [taskId]: "SUBMITTED" },
      };
    }),
  approveSubmission: (submissionId) =>
    set((state) => {
      const submission = state.submissions.find((item) => item.id === submissionId);
      if (!submission) return state;

      const taskId = taskTypeToTaskId(submission.taskType);
      const nextTaskStatus = { ...state.taskStatus, [taskId]: "APPROVED" as TaskStatus };
      unlockNextTask(nextTaskStatus, taskId);

      return {
        submissions: state.submissions.map((item) =>
          item.id === submissionId ? { ...item, status: "APPROVED" } : item
        ),
        taskStatus: nextTaskStatus,
      };
    }),
  addGeneratedCopies: (copies) =>
    set((state) => ({
      generatedCopies: [...copies, ...state.generatedCopies].slice(0, 9),
    })),
  claimReward: (campaignId, rewardId) => {
    const existing = get().claimedRewards[rewardId];
    if (existing) return existing;

    const code = `HX-${campaignId}-${rewardId}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    set((state) => ({
      claimedRewards: { ...state.claimedRewards, [rewardId]: code },
    }));
    return code;
  },
}));
