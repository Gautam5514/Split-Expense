import { rankContacts, emailIn } from "../modules/autopilot/people.js";
const c = names => names.map((name, i) => ({ _id: String(i), name }));
describe("Autopilot people matching", () => {
  test("prefers the exact name, then a whole word, then a word prefix", () => {
    expect(rankContacts("sagar", c(["Sagar", "Sagar Verma"])).map(x => x.name)).toEqual(["Sagar"]);
    expect(rankContacts("Sagar", c(["Sagar Verma", "Priya Sagar"])).map(x => x.name)).toEqual(["Sagar Verma", "Priya Sagar"]);
    expect(rankContacts("rav", c(["Ravi Kumar", "Gaurav"])).map(x => x.name)).toEqual(["Ravi Kumar"]);
  });
  test("never matches inside a word", () => { expect(rankContacts("rav", c(["Gaurav"]))).toEqual([]); });
  test("extracts a valid email from free text only", () => {
    expect(emailIn("ravi: Ravi.K@Gmail.com please")).toBe("ravi.k@gmail.com");
    expect(emailIn("no email here")).toBeNull();
  });
});
