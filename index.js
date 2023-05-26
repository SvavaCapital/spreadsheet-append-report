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
  const sheet = doc.sheetsByIndex[0];
  const date = new Date().toLocaleString("default", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  await sheet.addRows([[github.context.ref, ...coverage, date, status, msg]]);
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
    const coverageReport = getCoveragePercentage(report);
    if (coverageReport.length > 0)
      pushIntoExcel(coverageReport, "success", "-");
    else throw "Empty report";
  } catch (err) {
    pushIntoExcel(Array(4).fill("-"), "failure", err.message);
    core.setFailed(err.message);
  }
})();
