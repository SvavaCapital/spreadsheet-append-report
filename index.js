const core = require("@actions/core");
const github = require("@actions/github");
const DomParser = require("dom-parser");
const { GoogleSpreadsheet } = require("google-spreadsheet");

const parser = new DomParser();
const doc = new GoogleSpreadsheet(core.getInput("doc_id"));

const pushIntoExcel = async (coverage = [], status, msg) => {
  await doc.useServiceAccountAuth({
    private_key: core.getInput("private_key"),
    client_email: core.getInput("client_email"),
  }); // authenticating credential for gcloud service

  await doc.loadInfo(); // loads document properties and worksheets
  const sheet = doc.sheetsByIndex[1];
  const date = new Date().toLocaleTimeString("default", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const prDetails =
    github.context.base_ref && github.context.ref_name
      ? `${github.context.ref} (${github.context.base_ref} <-- ${github.context.ref_name})`
      : github.context.ref;

  await sheet.addRows([[prDetails || "-", ...coverage, date, status, msg]]);
};

const getCoveragePercentage = (report) => {
  // this fn fetches coverage percentage from dom report
  const dom = parser.parseFromString(report);
  const divArr = dom.getElementsByTagName("div");
  return divArr.slice(1).map((d) => d.innerHTML);
};

(async () => {
  try {
    const report = core.getInput("report");
    const status = core.getInput("status");
    const coverageReport = getCoveragePercentage(report);
    if (status === "success") pushIntoExcel(coverageReport, "success", "-");
    else throw "Your test cases got failed. Please check!!";
  } catch (err) {
    if (typeof err === "string")
      pushIntoExcel(Array(4).fill("-"), "failure", err);
    else core.setFailed(err.message);
  }
})();
