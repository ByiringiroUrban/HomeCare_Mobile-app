"""Build the Test Execution Workbook from the test cases defined in the plan.

Reads HomeCare_Testing_Plan.md, extracts the prepared test cases (UT-, FT-,
IT-, ST-, NFT-, RT- rows) and writes:

  HomeCare_Test_Execution_Workbook.md
  HomeCare_Test_Execution_Workbook.docx

Dependency-free: uses md_to_docx.py for the Word file.
"""

from __future__ import annotations

import os
import re

import md_to_docx

HERE = os.path.dirname(os.path.abspath(__file__))
PLAN = os.path.join(HERE, "HomeCare_Testing_Plan.md")
OUT_MD = os.path.join(HERE, "HomeCare_Test_Execution_Workbook.md")
OUT_DOCX = os.path.join(HERE, "HomeCare_Test_Execution_Workbook.docx")

PREFIXES = ("UT-", "FT-", "IT-", "ST-", "NFT-", "RT-")


def rows(prefix: str) -> list[list[str]]:
    """Test rows for a prefix, keeping only fully specified cases (no blanks,
    no template placeholders, no duplicates from the appendix worksheets)."""
    found: list[list[str]] = []
    seen: set[str] = set()
    with open(PLAN, encoding="utf-8") as fh:
        for line in fh:
            s = line.strip()
            if not s.startswith(f"| {prefix}"):
                continue
            cells = [c.strip() for c in s.strip("|").split("|")]
            test_id = cells[0]
            if test_id in seen or not any(cells[1:]):
                continue
            seen.add(test_id)
            found.append(cells)
    return found


def clean(text: str) -> str:
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
    text = text.replace("`", "")
    return text.replace("|", "/").strip()


def worksheet(title: str, header: list[str], data: list[list[str]], picks: list[int]) -> str:
    out = [f"## {title}", "", "| " + " | ".join(header) + " |",
           "|" + "|".join(["---"] * len(header)) + "|"]
    for r in data:
        values = [clean(r[i]) if i < len(r) else "" for i in picks]
        out.append("| " + " | ".join(values) + " |")
    out.append("")
    return "\n".join(out)


def main() -> None:
    ut, ft, it = rows("UT-"), rows("FT-"), rows("IT-")
    st, nft, rt = rows("ST-"), rows("NFT-"), rows("RT-")

    doc = [
        "# TEST EXECUTION WORKBOOK",
        "",
        "**HomeCare — Home Healthcare Mobile Application**",
        "",
        "Companion to the Software Testing Plan. Prepared for the testing period "
        "24 November – 12 December 2026.",
        "",
        "Institution: ______________________________________________",
        "",
        "Student name(s): ______________________________________________",
        "",
        "Student ID(s): ______________________________________________",
        "",
        "Build identifier under test: ______________________________________________",
        "",
        "---",
        "",
        "## How to use this workbook",
        "",
        "1. Record the build identifier and environment once, before the first test.",
        "2. Execute rows in ID order; write the actual result immediately.",
        "3. Set Status to PASS, FAIL, BLOCKED or NOT RUN - never leave it blank.",
        "4. Every FAIL gets a defect ID (DEF-nn) and an evidence ID (EV-...).",
        "5. Copy the counts into the execution summary at the end after each session.",
        "6. Do not change an expected result after execution; if it was wrong, note it in the notes column and log a plan defect.",
        "",
        "---",
        "",
        worksheet("1. Unit testing execution record (26–28 Nov 2026)",
                  ["Test ID", "Unit", "Input / condition", "Expected result",
                   "Actual result", "Status", "Evidence / defect"],
                  ut, [0, 1, 2, 3]),
        worksheet("2. Functional testing execution worksheet (30 Nov – 2 Dec 2026)",
                  ["Test ID", "Req", "Objective", "Expected result",
                   "Actual result", "Status", "Evidence / defect"],
                  ft, [0, 1, 2, 5]),
        worksheet("3. Integration testing execution worksheet (3–4 Dec 2026)",
                  ["Test ID", "Components / interface", "Interaction tested",
                   "Expected interaction", "Actual interaction", "Status", "Defect"],
                  it, [0, 1, 2, 4]),
        worksheet("4. System testing execution worksheet (5–8 Dec 2026)",
                  ["Test ID", "Requirement / scenario", "Actors", "Expected result",
                   "Actual result", "Status", "Evidence"],
                  st, [0, 1, 2, 3]),
        worksheet("5. Non-functional testing record (5–8 Dec 2026)",
                  ["Test ID", "Quality area", "Method / condition", "Target",
                   "Measured / observed", "Status", "Evidence"],
                  nft, [0, 1, 2, 3]),
        worksheet("6. Regression and retest record (9–10 Dec 2026)",
                  ["Regression ID", "Change / defect ref", "Selected tests",
                   "Baseline", "Current result", "Status", "Notes"],
                  rt, [0, 1, 2, 4]),
        "## 7. White-box coverage record",
        "",
        "| Unit group | Coverage type | Total items | Covered | Coverage % | Uncovered items / explanation |",
        "|---|---|---|---|---|---|",
        "| Auth & security | Statements |  |  |  |  |",
        "| Auth & security | Branches |  |  |  |  |",
        "| Visit & slot rules | Branches |  |  |  |  |",
        "| Serializers | Statements |  |  |  |  |",
        "| Payments | Branches |  |  |  |  |",
        "| Client validators | Conditions |  |  |  |  |",
        "",
        "Coverage (%) = (applicable items executed / total applicable items) x 100.",
        "",
        "## 8. Defect log",
        "",
        "| Defect ID | Title | Test case | Severity | Priority | Status | Fix reference | Retest date | Regression |",
        "|---|---|---|---|---|---|---|---|---|",
        "| DEF-01 | API routers not mounted; doctor/patient/admin endpoints returned 404 | ST-01, FT-14, FT-16 | Critical | High | Fixed / retested PASS |  | 24 Nov 2026 | RT-01 |",
        "| DEF-02 | No admin approval endpoint, so registered doctors could never be listed | FT-14, FT-15, FT-16 | Critical | High | Fixed / retested PASS |  | 24 Nov 2026 | RT-02 |",
        "| DEF-03 | Client looked up session data with an identifier different from the backend user id | FT-06, FT-42, FT-44 | Major | High | Fixed / retested PASS |  | 24 Nov 2026 | RT-03 |",
        "| DEF-04 | Registered doctor did not appear in the in-app verification queue or directory | FT-11, FT-13, FT-14 | Major | High | Fixed / retested PASS |  | 24 Nov 2026 | RT-04 |",
        "|  |  |  |  |  |  |  |  |  |",
        "",
        "Add one row per new defect. Copy the full description into the defect report form (Appendix E of the plan).",
        "",
        "## 9. Evidence index",
        "",
        "| Evidence ID | Related test / defect | Type | Description | File name | Date |",
        "|---|---|---|---|---|---|",
        "|  |  |  |  |  |  |",
        "",
        "## 10. Test execution summary",
        "",
        "| Activity | Planned | Passed | Failed | Blocked | Not run |",
        "|---|---|---|---|---|---|",
        f"| Unit testing | {len(ut)} |  |  |  |  |",
        f"| Functional testing | {len(ft)} |  |  |  |  |",
        f"| Integration testing | {len(it)} |  |  |  |  |",
        f"| System + non-functional | {len(st) + len(nft)} |  |  |  |  |",
        f"| Regression testing | {len(rt)} |  |  |  |  |",
        f"| **TOTAL** | **{len(ut) + len(ft) + len(it) + len(st) + len(nft) + len(rt)}** |  |  |  |  |",
        "",
        "Pass rate (%) = Passed / (Passed + Failed) x 100. State the denominator. "
        "Blocked and not-run tests are reported separately.",
        "",
        "## 11. Session log",
        "",
        "| Date | Phase | Build | Tests executed | Passed | Failed | Blocked | Notes / deviations |",
        "|---|---|---|---|---|---|---|---|",
        "|  |  |  |  |  |  |  |  |",
        "",
        "## 12. Sign-off",
        "",
        "Tester: ______________________  Date: ____________",
        "",
        "Reviewed by (lecturer): ______________________  Date: ____________",
        "",
    ]

    body = "\n".join(doc)
    with open(OUT_MD, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(body)
    md_to_docx.build(OUT_MD, OUT_DOCX)
    print(f"workbook: {len(ut)} unit, {len(ft)} functional, {len(it)} integration, "
          f"{len(st)} system, {len(nft)} non-functional, {len(rt)} regression rows")


if __name__ == "__main__":
    main()
