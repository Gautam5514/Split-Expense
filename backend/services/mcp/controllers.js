// The REST controllers the MCP tools reuse. Kept in one module so the bridge
// can import them lazily and tests can replace them in one place.
export {
  addExpense,
  updateExpense,
  deleteExpense,
  requestSettlement,
  confirmSettlementRequest,
  rejectSettlementRequest,
  cancelSettlementRequest,
  getPendingSettlements,
  maxSettleableBetween,
} from "../../controllers/expenseController.js";

export {
  createGroup,
  addMembersByEmail,
  removeMember,
  markGroupCompleted,
  deleteGroup,
  generateInviteLink,
  joinGroupByInvite,
  resendGroupReport,
  getGroupReportStatus,
  retryGroupReport,
} from "../../controllers/groupController.js";

export {
  updateGroupSettings,
  getGroupSummary,
  listRecurring,
  createRecurring,
  updateRecurring,
  deleteRecurring,
} from "../../controllers/groupExtrasController.js";

export {
  getMyInvites,
  acceptInvite,
  declineInvite,
  leaveGroup,
  getGroupInvites,
  approveJoinRequest,
  cancelGroupInvite,
} from "../../controllers/inviteController.js";

export { getUserAnalytics } from "../../controllers/userAnalyticsController.js";

export { getContacts, lookupByEmail, getPrivacy, updatePrivacy } from "../../controllers/peopleController.js";
export { globalSearch } from "../../controllers/globalSearchController.js";

export {
  createQuickSplit,
  listQuickSplits,
  getQuickSplit,
  setParticipantPaid,
  deleteQuickSplit,
} from "../../controllers/quickSplitController.js";

export { createNotepad, getGroupNotepads, addStep } from "../../controllers/notepadController.js";
export { sendGroupMessage } from "../../controllers/groupChatController.js";
