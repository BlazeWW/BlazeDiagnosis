# Student assessment and production sign-off

Every BD issue has a named student owner, deadline, mentor, difficulty and independently reviewable output. No group-only credit. Rubric: acceptance criteria 35%; technical/test quality 25%; commit/PR/documented work 20%; security/maintainability 10%; demo/handover 10%. Record review comments and demo links rather than counting commits alone.

Weekly progression: W1 contracts and baseline; W2 first PR; W4 feature milestones; W6 staging and regression; W7 security and operational evidence; W8 UAT and conditional release decision.

Release gate must show: critical workflows persist end-to-end; tenant authorization and customer/internal serializers verified; clean migrations fresh and upgrade fixtures; financial correctness; no known exploitable critical/high security issues; responsive and accessible UAT; CI green from exact release SHA; backups and restore tested; monitoring/alerts and documented on-call plan; lead-approved release notes and rollback. Every exception is recorded with owner, expiry, risk acceptance and mitigation; never waive tenant isolation, integrity or backup fundamentals.

Go/no-go record: release SHA, date, tests and CI URLs, migration results, security findings, UAT results, recovery evidence, approvers, remaining risks, formal BlazeWebWorks sign-off.
