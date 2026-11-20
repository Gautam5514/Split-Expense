// Follow-ups to a group plan that is waiting for approval: they must change that
// plan, not start a new request that has no group to act on. Pure, no database.
import { readGroupFollowUp, buildPlan, readNameAnswer, applyGroupName } from "../modules/autopilot/planner.js";

const me = "000000000000000000000001";
const waiting = (extra = []) => ({
  groupName: null, currency: null, clarification: null,
  actions: [{ type: "create_group", name: "Business plan", members: ["a@x.com", "b@x.com", "c@x.com"], groupType: "trip" }, { type: "set_group_budget", amount: "300000" }, ...extra],
});
const members = (intent) => intent.actions.find((a) => a.type === "create_group").members;

describe("adding people to the group being planned", () => {
  test("the reported message: Hinglish, punctuation and an email", () => {
    const out = readGroupFollowUp("add one more...!!! gopo1247@gmail.com isko bhi add kro isme..!!!", waiting());
    expect(members(out)).toEqual(["a@x.com", "b@x.com", "c@x.com", "gopo1247@gmail.com"]);
    expect(out.actions.find((a) => a.type === "set_group_budget").amount).toBe("300000"); // the rest of the plan is untouched
  });

  test.each([
    ["also add riya@mail.com", ["riya@mail.com"]],
    ["riya@mail.com", ["riya@mail.com"]],
    ["invite d@x.com and e@x.com too", ["d@x.com", "e@x.com"]],
    ["Riya bhi", ["Riya"]],
    ["add Riya and Karan", ["Riya", "Karan"]],
    ["Riya ko bhi add kar do isme", ["Riya"]],
  ])("%s", (text, added) => {
    expect(members(readGroupFollowUp(text, waiting()))).toEqual(["a@x.com", "b@x.com", "c@x.com", ...added]);
  });

  test("someone already in the plan is not added twice", () => {
    expect(members(readGroupFollowUp("add A@X.com", waiting()))).toHaveLength(3);
  });

  test("the patched request plans into one group with four people, nothing to ask about the group", () => {
    const intent = readGroupFollowUp("gopo1247@gmail.com isko bhi add kro", waiting());
    const people = Object.fromEntries(members(intent).map((email) => [email, { ref: email, status: "email", email, name: email }]));
    const plan = buildPlan(intent, { actorId: me, people, groups: [], message: "x 300000" });
    expect(plan.clarifications.join(" ")).not.toMatch(/which group|couldn't find a group/i);
    expect(plan.steps.find((s) => s.type === "add_members").payload.people).toHaveLength(4);
  });
});

describe("other changes to the waiting group plan", () => {
  test("remove a person, by email or by name", () => {
    expect(members(readGroupFollowUp("remove b@x.com", waiting()))).toEqual(["a@x.com", "c@x.com"]);
    const named = { ...waiting(), actions: [{ type: "create_group", name: "Goa", members: ["Aman", "Priya Shah"], groupType: "trip" }] };
    expect(members(readGroupFollowUp("Priya ko hata do", named))).toEqual(["Aman"]);
    expect(readGroupFollowUp("remove Zed", named)).toBeNull(); // nobody by that name: read it the normal way
  });

  test("budget: changed when there is one, added when there isn't", () => {
    expect(readGroupFollowUp("budget 4 lakh kar do", waiting()).actions.find((a) => a.type === "set_group_budget").amount).toBe("400000");
    const noBudget = { ...waiting(), actions: [waiting().actions[0]] };
    expect(readGroupFollowUp("make the budget 50,000", noBudget).actions.at(-1)).toEqual({ type: "set_group_budget", amount: "50000" });
  });

  test("rename", () => {
    expect(readGroupFollowUp("call it team offsite", waiting()).actions[0].name).toBe("Team offsite");
  });

  test("“the same group we just made” keeps the plan as it is instead of asking again", () => {
    expect(readGroupFollowUp("in same business mai..!! abhi jo bnye", waiting())).toEqual(waiting());
    expect(readGroupFollowUp("same group", waiting())).toEqual(waiting());
  });
});

describe("it stays out of the way of everything else", () => {
  test.each([
    "who owes whom?",
    "Dinner 3600 paid by me, split equally",
    "delete it",
    "add dinner 500 with a@x.com",
    "what can you do",
    "send the statement to riya@mail.com after the trip is over and everyone has paid up",
  ])("%s", (text) => {
    expect(readGroupFollowUp(text, waiting())).toBeNull();
  });

  test("a plan that is not about a group is never touched", () => {
    const bill = { groupName: null, currency: null, clarification: null, actions: [{ type: "create_expense", title: "Dinner", amount: "3000", payer: "me", participants: [], excluded: [], splitType: "equal", shares: [] }] };
    expect(readGroupFollowUp("Riya bhi", bill)).toBeNull();
    expect(readGroupFollowUp("add x@y.com", bill)).toBeNull();
  });
});

describe("answering “what should the group be called?”", () => {
  const ASK = "Please provide a name for the new business group you want to create.";
  const REQUEST = "create a business plan in that three are 1. me 2 is gautamgpandit01@gmail.com 3. gautampandit797@gmail.com and the last is yashika so add these all and budges add the 3lakh";
  const asked = (extra = {}) => ({ status: "clarification_required", intent: { clarification: ASK, actions: [] }, plan: { clarifications: [ASK], questions: [] }, ...extra });

  test.each([
    ["my-own", "my-own"],
    ["My Own", "My Own"],
    ["call it Team Offsite", "Team Offsite"],
    ["name is my-own", "my-own"],
    ["“Goa 2026”.", "Goa 2026"],
    ["naam my-own rakho", "my-own"],
  ])("%s → %s", (reply, name) => {
    expect(readNameAnswer(reply, asked())).toBe(name);
  });

  test("only when a name was actually asked for, and only for something that can be a name", () => {
    expect(readNameAnswer("my-own", asked({ status: "waiting_approval" }))).toBeNull();
    expect(readNameAnswer("my-own", asked({ intent: { clarification: "How much was the dinner?", actions: [] }, plan: { clarifications: ["How much was the dinner?"], questions: [] } }))).toBeNull();
    for (const reply of ["cancel", "nahi", "why?", "x@y.com", "a"]) expect(readNameAnswer(reply, asked())).toBeNull();
  });

  test("the name goes onto the group the reader built, and the question is not asked again", () => {
    const read = { groupName: null, currency: null, clarification: "What would you like to name the group?", actions: [{ type: "create_group", name: "Business plan", members: ["a@x.com", "yashika"], groupType: "business" }, { type: "set_group_budget", amount: "300000" }] };
    const out = applyGroupName(read, "my-own", REQUEST);
    expect(out.actions[0]).toMatchObject({ type: "create_group", name: "my-own", members: ["a@x.com", "yashika"] });
    expect(out.clarification).toBeNull();
    expect(out.actions[1]).toEqual({ type: "set_group_budget", amount: "300000" });
  });

  test("if the reader built nothing, the group is made from the name and the people in the request", () => {
    const nothing = { groupName: null, currency: null, clarification: ASK, actions: [] };
    const out = applyGroupName(nothing, "my-own", REQUEST);
    expect(out.actions).toEqual([{ type: "create_group", name: "my-own", members: ["gautamgpandit01@gmail.com", "gautampandit797@gmail.com"], groupType: null }]);
    expect(out.clarification).toBeNull();
    // People it had already understood are kept rather than re-read from the text.
    const some = { groupName: "my-own", currency: null, clarification: ASK, actions: [{ type: "add_members", members: ["yashika", "a@x.com"] }, { type: "set_group_budget", amount: "300000" }] };
    const kept = applyGroupName(some, "my-own", REQUEST);
    expect(kept.actions.map((a) => a.type)).toEqual(["create_group", "set_group_budget"]);
    expect(kept.actions[0].members).toEqual(["yashika", "a@x.com"]);
    expect(kept.groupName).toBeNull();
  });
});
