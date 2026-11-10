// Failures that will never succeed for this recipient (bad/unknown address,
// rejected mailbox). Everything else - throttling, timeouts, auth/config
// problems that an admin can fix - is worth retrying later.
export const isPermanentRecipientError = (err) => {
  const code = err?.responseCode;
  if ([550, 551, 553, 501].includes(code)) return true;
  return err?.code === "EENVELOPE" && /recipient|address/i.test(err?.message || "");
};
