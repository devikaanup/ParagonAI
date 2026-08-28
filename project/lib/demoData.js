/**
 * Built-in Demo Candidate and Pre-computed Golden Run Dataset
 * Realistic evaluation featuring real tensions, verifiable quotes, genuine debate,
 * and resolvable vs unresolvable disagreements.
 */

export const DEMO_CANDIDATE = {
  name: "Alex Rivera",
  roleTitle: "Staff Distributed Systems Engineer",
  jobDescription: `Position: Staff Distributed Systems Engineer
Team: Core Infrastructure & Storage Platforms

Role Overview:
We are looking for a Staff Distributed Systems Engineer to design, scale, and maintain our global distributed state machine and metadata replication layer handling over 2.5 million QPS. You will guide architectural standards, drive high-availability resilience, and mentor senior infrastructure engineers.

Responsibilities:
- Architect and operate fault-tolerant consensus and replicated data storage engines (Raft, Paxos, Multi-Raft).
- Lead multi-region disaster recovery and continuous zero-downtime database schema migrations.
- Establish observability, chaos engineering, and incident management protocols across core services.
- Mentor 6+ senior engineers and partner with product leads on cross-functional infrastructure roadmaps.

Requirements (Must-Have):
- 8+ years experience building low-latency, mission-critical distributed systems in Go, Rust, or C++.
- Deep production mastery of distributed consensus protocols (Raft, etcd, Consul, or CockroachDB internals).
- Demonstrated experience diagnosing complex distributed race conditions, split-brain scenarios, and network partitions.
- Proven track record leading major post-incident investigations and blameless post-mortems.

Nice-to-Have:
- Contributions to open-source distributed database ecosystems.
- Production experience with eBPF networking telemetry and Kubernetes Custom Resource Controllers.`,

  resume: `ALEX RIVERA
Staff Distributed Systems Engineer | San Francisco, CA | alex.rivera@infra-systems.dev

SUMMARY:
Distributed systems specialist with 9 years of experience designing high-throughput consensus systems, multi-region metadata engines, and zero-downtime data pipelines. Proven leader in blameless post-mortems and infrastructure reliability.

EXPERIENCE:

Staff Infrastructure Engineer — Apex Storage Technologies (2022 – Present)
- Principal architect for global Raft-based metadata storage cluster processing 3.1M operations/sec at sub-5ms p99 latency.
- Achieved 99.999% uptime across 18 months by engineering automated heartbeat partition recovery and leaseholder rebalancing.
- Built custom Go-based Kubernetes operator automating snapshot backups, disk rebalancing, and canary node upgrades across 400+ nodes.
- Spearheaded company-wide blameless post-mortem framework and mentored 7 engineers on distributed consistency verification using Jepsen testing.

Senior Backend Engineer — DataGrid Cloud Platforms (2018 – 2022)
- Designed and maintained asynchronous change-data-capture (CDC) pipeline ingesting 14 TB/day into CockroachDB with guaranteed at-least-once semantics.
- Reduced inter-region replication latency by 42% through custom TCP packet batching and eBPF socket tracing.
- Led migration of 120-table monolithic relational database to distributed multi-tenant storage with zero customer-facing downtime.

EDUCATION:
B.S. in Computer Science — University of Washington (2014 – 2018)

TECHNICAL SKILLS:
Languages: Go, Rust, C++, Python, SQL
Distributed Systems: Raft Consensus, CockroachDB, etcd, Kafka, gRPC, Jepsen Testing
Cloud & Systems: Kubernetes, eBPF, Linux Kernel Tuning, Prometheus, Envoy`,

  transcript: `INTERVIEW TRANSCRIPT — ALEX RIVERA
Role: Staff Distributed Systems Engineer
Interviewer: Principal Infrastructure Architect & VP of Engineering

[00:02:15] Interviewer: "Alex, thanks for joining. Let's dive straight into your work at Apex. You mentioned building the global Raft metadata cluster. Walk us through how you handled partition isolation."
[00:02:45] Alex Rivera: "At Apex, we had 5-node replica groups across 3 regions. When AWS had transit gateway flapping, standard Raft would trigger unnecessary election storms because follower heartbeat timeouts were too tight. I implemented adaptive leader lease extensions with preemptive quorum checks before stepping down. We verified this using continuous Jepsen fault-injection testing in our staging environment."
[00:07:30] Interviewer: "On your resume you highlight achieving 99.999% uptime over 18 months. Did you encounter any major outages during that period?"
[00:08:12] Alex Rivera: "To be completely candid, we had one 3-hour cascading failure in Q3 during a cluster schema migration that required an emergency rollback. The metrics aggregation showed four nines on our primary SLA because read replicas stayed up, but write availability was degraded for roughly three hours. I wrote the full post-mortem detailing how an unexpected lock contention in the leaseholder handoff caused the queue stall. We added automated lease transfer fencing to ensure it can never recur."
[00:15:20] Interviewer: "Tell us about leading the monolithic migration at DataGrid. How did you coordinate that with the team?"
[00:16:05] Alex Rivera: "I designed the dual-write proxy architecture and the shadow verification pipeline. However, the operational execution was a tight 4-person strike team. Two senior engineers handled the query rewrite layer while I focused on the consensus commit path and data integrity validators. I wouldn't say I single-handedly did it — it required daily synchronization and aggressive pairing."
[00:22:40] Interviewer: "How do you handle disagreements when a junior or mid-level engineer proposes an architectural approach you think is flawed?"
[00:23:15] Alex Rivera: "I never use seniority as an argument. I ask them to write out the failure modes: what happens if the network drops 5% of packets, or if disk I/O stalls? If we test those hypotheses on a branch with chaos tests, the data settles the debate without anyone feeling overruled. I've found that mentoring through testable failure scenarios builds much deeper ownership than lecturing."`
};

export const GOLDEN_RUN_OUTPUT = {
  isGoldenRun: true,
  runId: "golden-demo-run-2026",
  timestamp: new Date().toISOString(),
  candidate: {
    name: "Alex Rivera",
    role: "Staff Distributed Systems Engineer"
  },
  evaluation_context: {
    role: {
      title: "Staff Distributed Systems Engineer",
      requirements: [
        "8+ years experience building low-latency distributed systems in Go, Rust, or C++",
        "Deep production mastery of distributed consensus protocols (Raft, etcd, CockroachDB)",
        "Demonstrated experience diagnosing race conditions, split-brain scenarios, and network partitions",
        "Proven track record leading blameless post-mortems"
      ],
      responsibilities: [
        "Architect and operate fault-tolerant consensus and replicated data storage engines",
        "Lead multi-region disaster recovery and continuous zero-downtime database schema migrations",
        "Mentor 6+ senior engineers and partner with product leads"
      ],
      must_have: [
        "8+ years distributed systems experience",
        "Raft consensus mastery",
        "Post-mortem leadership"
      ],
      nice_to_have: [
        "Open-source contributions",
        "eBPF networking telemetry",
        "Kubernetes CRD controllers"
      ]
    },
    candidate: {
      name: "Alex Rivera",
      summary: "Senior distributed systems engineer with 9 years specializing in Raft consensus engines, high-scale metadata replication (3.1M ops/sec), and blameless reliability culture."
    },
    skills: ["Go", "Rust", "C++", "Raft Consensus", "CockroachDB", "etcd", "Kubernetes", "eBPF", "Jepsen Testing"],
    experience: [
      {
        role: "Staff Infrastructure Engineer",
        company: "Apex Storage Technologies",
        duration: "2022 – Present",
        highlights: [
          "Principal architect for Raft-based metadata cluster processing 3.1M ops/sec at sub-5ms p99 latency",
          "Engineered adaptive leader lease extensions with preemptive quorum checks",
          "Mentored 7 engineers on Jepsen consistency testing"
        ]
      },
      {
        role: "Senior Backend Engineer",
        company: "DataGrid Cloud Platforms",
        duration: "2018 – 2022",
        highlights: [
          "Designed dual-write CDC pipeline ingesting 14 TB/day into CockroachDB",
          "Reduced inter-region replication latency by 42% via eBPF TCP socket tracing"
        ]
      }
    ],
    education: ["B.S. in Computer Science — University of Washington (2014 – 2018)"],
    projects: [
      {
        name: "Adaptive Raft Leader Lease Controller",
        description: "Preemptive quorum verification preventing election storms during transit gateway flapping",
        technologies: ["Go", "Raft", "Jepsen"]
      }
    ],
    claims: [
      {
        claim: "Architected Raft cluster processing 3.1M operations/sec at sub-5ms p99 latency",
        source: "resume",
        quote: "Principal architect for global Raft-based metadata storage cluster processing 3.1M operations/sec at sub-5ms p99 latency.",
        location: "Resume — Apex Storage Technologies"
      },
      {
        claim: "Achieved 99.999% uptime across 18 months",
        source: "resume",
        quote: "Achieved 99.999% uptime across 18 months by engineering automated heartbeat partition recovery and leaseholder rebalancing.",
        location: "Resume — Apex Storage Technologies"
      },
      {
        claim: "Experienced a 3-hour cascading write degradation in Q3 during cluster schema migration",
        source: "interview",
        quote: "To be completely candid, we had one 3-hour cascading failure in Q3 during a cluster schema migration that required an emergency rollback.",
        location: "Transcript [00:08:12]"
      },
      {
        claim: "Collaborated in a 4-person strike team on the DataGrid database migration",
        source: "interview",
        quote: "I designed the dual-write proxy architecture and the shadow verification pipeline. However, the operational execution was a tight 4-person strike team.",
        location: "Transcript [00:16:05]"
      },
      {
        claim: "Uses failure mode testing and Jepsen chaos verification to resolve architectural disagreements",
        source: "interview",
        quote: "I never use seniority as an argument. I ask them to write out the failure modes: what happens if the network drops 5% of packets, or if disk I/O stalls?",
        location: "Transcript [00:23:15]"
      }
    ],
    potential_inconsistencies: [
      {
        topic: "Uptime Metric vs Operational Outage",
        resume_statement: "Achieved 99.999% uptime across 18 months",
        interview_statement: "we had one 3-hour cascading failure in Q3 during a cluster schema migration",
        observation: "Resume claims five-nines availability across 18 months, whereas transcript discloses a 3-hour write degradation outage during a schema migration."
      },
      {
        topic: "Sole Ownership vs Strike Team Execution",
        resume_statement: "Led migration of 120-table monolithic relational database",
        interview_statement: "the operational execution was a tight 4-person strike team. Two senior engineers handled the query rewrite layer while I focused on the consensus commit path",
        observation: "Resume implies unilateral migration leadership, whereas interview clarifies a distributed strike team where candidate owned core consensus paths."
      }
    ]
  },

  opinions: [
    {
      agent: "Technical Agent",
      score: 94,
      confidence: "High",
      verdict: "Strong Hire",
      summary: "Exceptional mastery of distributed consensus, real-world fault injection with Jepsen, and deep knowledge of Raft edge cases.",
      evidence_quotes: [
        {
          quote: "I implemented adaptive leader lease extensions with preemptive quorum checks before stepping down. We verified this using continuous Jepsen fault-injection testing in our staging environment.",
          relevance: "Demonstrates practical mastery of distributed consensus subtleties rather than textbook knowledge.",
          claim_ref: "Raft partition handling",
          isValid: true,
          validationReason: "Verified against source evidence"
        },
        {
          quote: "Reduced inter-region replication latency by 42% through custom TCP packet batching and eBPF socket tracing.",
          relevance: "Proves low-level systems and Linux kernel telemetry skills directly matching nice-to-have criteria.",
          claim_ref: "eBPF optimization",
          isValid: true,
          validationReason: "Verified against source evidence"
        }
      ],
      strengths: [
        "Extensive production experience with Raft, Paxos, and CockroachDB internals",
        "Demonstrated understanding of partition election storms and leaseholder transfer fencing",
        "Practical experience running Jepsen consistency tests"
      ],
      concerns: [
        "Focus is heavily deep backend/kernel infrastructure; less exposure to high-level product engineering"
      ],
      reasoning: "Alex displays world-class distributed systems capability. Their explanation of adaptive leader leases and preemptive quorum checks shows genuine battle-tested depth. The post-mortem remediation for the Q3 lock contention demonstrates sound technical rigor.",
      evidenceQuality: { totalQuotes: 2, validQuotes: 2, verificationRate: 100 }
    },
    {
      agent: "HR / Culture Agent",
      score: 88,
      confidence: "High",
      verdict: "Hire",
      summary: "Strong collaborative ethos, intellectual transparency regarding past failures, and an empowering data-driven mentorship approach.",
      evidence_quotes: [
        {
          quote: "To be completely candid, we had one 3-hour cascading failure in Q3 during a cluster schema migration that required an emergency rollback.",
          relevance: "Exemplifies unprompted transparency and accountability regarding production mistakes.",
          claim_ref: "Q3 outage admission",
          isValid: true,
          validationReason: "Verified against source evidence"
        },
        {
          quote: "I never use seniority as an argument. I ask them to write out the failure modes: what happens if the network drops 5% of packets, or if disk I/O stalls?",
          relevance: "Shows psychological safety and objective mentorship style that avoids hierarchical friction.",
          claim_ref: "Mentorship philosophy",
          isValid: true,
          validationReason: "Verified against source evidence"
        }
      ],
      strengths: [
        "Proactive blameless honesty about past production outages",
        "Generous attribution of credit to teammates on the DataGrid migration",
        "Evidence-backed coaching methodology for junior engineers"
      ],
      concerns: [
        "High directness in technical reviews may require calibration with less senior teams"
      ],
      reasoning: "Alex displays exceptional cultural maturity. Admitting the 3-hour write degradation unprompted when asked about uptime claims demonstrates high integrity. Their mentorship approach through failure-mode exploration is a model for Staff-level leadership.",
      evidenceQuality: { totalQuotes: 2, validQuotes: 2, verificationRate: 100 }
    },
    {
      agent: "Hiring Manager Agent",
      score: 91,
      confidence: "High",
      verdict: "Strong Hire",
      summary: "Direct hit for the core distributed storage role; brings immediate velocity and proven incident leadership to our metadata platform.",
      evidence_quotes: [
        {
          quote: "Principal architect for global Raft-based metadata storage cluster processing 3.1M operations/sec at sub-5ms p99 latency.",
          relevance: "Exact match with our required 2.5M QPS metadata replication layer.",
          claim_ref: "Apex Scale",
          isValid: true,
          validationReason: "Verified against source evidence"
        },
        {
          quote: "I designed the dual-write proxy architecture and the shadow verification pipeline.",
          relevance: "Demonstrates architectural authority combined with effective delegation.",
          claim_ref: "DataGrid migration architecture",
          isValid: true,
          validationReason: "Verified against source evidence"
        }
      ],
      strengths: [
        "Has operated systems at scale (3.1M ops/sec) exceeding our current 2.5M target",
        "Proven ability to lead blameless incident investigations and build automated recovery tools",
        "Meets all core must-have requirements with zero ramp-up delay"
      ],
      concerns: [
        "Need to ensure their definition of 99.999% uptime aligns with enterprise customer SLA reporting"
      ],
      reasoning: "From a business and organizational perspective, Alex represents an ideal Staff engineer hire. They have already solved the exact distributed consensus and partition management challenges our team is facing today.",
      evidenceQuality: { totalQuotes: 2, validQuotes: 2, verificationRate: 100 }
    },
    {
      agent: "Skeptic Agent",
      score: 68,
      confidence: "Medium",
      verdict: "Maybe",
      summary: "Significant tension between resume marketing (99.999% uptime, sole migration leadership) and interview reality (3-hour outage, 4-person team).",
      evidence_quotes: [
        {
          quote: "Achieved 99.999% uptime across 18 months by engineering automated heartbeat partition recovery and leaseholder rebalancing.",
          relevance: "Contrasts with the admission of a 3-hour write degradation in Q3.",
          claim_ref: "Uptime discrepancy",
          isValid: true,
          validationReason: "Verified against source evidence"
        },
        {
          quote: "the operational execution was a tight 4-person strike team. Two senior engineers handled the query rewrite layer while I focused on the consensus commit path",
          relevance: "Demonstrates that resume phrasing overstates individual migration scope.",
          claim_ref: "Team scope discrepancy",
          isValid: true,
          validationReason: "Verified against source evidence"
        }
      ],
      strengths: [
        "Possesses real technical skill when probed beyond the resume bullet points"
      ],
      concerns: [
        "Resume claims five-nines (under 8 minutes downtime/year) while concealing a 3-hour write outage behind read replica availability",
        "Resume uses singular verbs for team accomplishments"
      ],
      reasoning: "While Alex is clearly technically competent, their resume exhibits common resume inflation. A 3-hour write outage mathematically breaks 99.999% availability for writes (which allows under 8 minutes per year). Relying on read-availability to claim five-nines is a technical nuance that borderlines marketing spin.",
      evidenceQuality: { totalQuotes: 2, validQuotes: 2, verificationRate: 100 }
    }
  ],

  debate: [
    {
      agent: "Technical Agent",
      response: "I understand the Skeptic's concern regarding the five-nines calculation. However, in distributed systems architecture, distinguishing between write-path degradation and complete cluster blackout is standard engineering practice. What impressed me was that Alex proactively volunteered the 3-hour outage and explained the exact lock contention in the leaseholder handoff. That depth of post-mortem remediation proves genuine technical competence.",
      agreements: [
        { with_agent: "HR / Culture Agent", point: "Candor about the Q3 failure", reason: "Proves blameless engineering mindset" }
      ],
      disagreements: [
        { with_agent: "Skeptic Agent", point: "Severity of resume exaggeration", reason: "Read vs write SLA distinction is technically standard, and post-mortem was thorough" }
      ],
      revisions: [],
      remaining_uncertainties: ["Exact customer blast radius during the 3-hour Q3 write stall"],
      score_before: 94,
      score_after: 94,
      confidence: "High"
    },
    {
      agent: "HR / Culture Agent",
      response: "I agree with the Technical Agent. The Skeptic rightly caught the gap between the resume bullet and the interview statement, but the key behavioral signal is how Alex responded: they didn't deflect or blame teammates; they immediately said 'To be completely candid' and detailed the root cause. Furthermore, regarding the DataGrid migration, Alex explicitly corrected the interviewer to highlight their 3 teammates. That is the opposite of a credit-hog.",
      agreements: [
        { with_agent: "Technical Agent", point: "Intellectual honesty in incident review", reason: "Candidate showed immediate accountability" },
        { with_agent: "Skeptic Agent", point: "Identification of the resume phrasing gap", reason: "Valuable to verify, though candidate handled it well" }
      ],
      disagreements: [
        { with_agent: "Skeptic Agent", point: "Penalizing candidate for team collaboration", reason: "Crediting teammates in interview indicates humility, not exaggeration" }
      ],
      revisions: [],
      remaining_uncertainties: [],
      score_before: 88,
      score_after: 90,
      confidence: "High"
    },
    {
      agent: "Hiring Manager Agent",
      response: "The debate clarifies the exact risk profile. The Skeptic is right that we need to understand how Alex reports SLAs to non-technical stakeholders, but the Technical Agent's point on their Jepsen testing and Raft lease controllers convinces me they can run our 2.5M QPS tier. I revise my confidence to High because their candidate transparency shows they will be trustworthy in production war rooms.",
      agreements: [
        { with_agent: "Technical Agent", point: "Technical fit for metadata cluster scale", reason: "Candidate has already solved our immediate engineering bottlenecks" },
        { with_agent: "HR / Culture Agent", point: "Staff-level mentorship approach", reason: "Data-driven chaos testing will elevate our junior engineers" }
      ],
      disagreements: [
        { with_agent: "Skeptic Agent", point: "Treating the Q3 outage as a blocker", reason: "A blamelessly resolved outage with automated guardrails is a sign of experience" }
      ],
      revisions: [
        { aspect: "Operational Risk", old_position: "Minor concern over uptime reporting", new_position: "Satisfied that incident response protocols are sound", reason: "Clear explanation of lease transfer fencing guardrails" }
      ],
      remaining_uncertainties: ["Whether Alex has managed cross-functional product roadmaps in addition to pure infrastructure"],
      score_before: 91,
      score_after: 93,
      confidence: "High"
    },
    {
      agent: "Skeptic Agent",
      response: "I acknowledge the HR Agent's point that Alex readily credited their 4-person team during the interview, and I concede that their technical post-mortem on the leaseholder lock contention was solid. However, I maintain my core skepticism regarding SLA transparency: claiming 99.999% uptime on a resume while knowing there was a 3-hour write outage is misleading to non-technical recruiters. I will raise my score from 68 to 74 to reflect their genuine post-mortem rigor, but we must leave this as an open inquiry for the human interviewer.",
      agreements: [
        { with_agent: "HR / Culture Agent", point: "Teammate credit attribution", reason: "Candidate did share credit appropriately when asked" },
        { with_agent: "Technical Agent", point: "Deep knowledge of Raft failure modes", reason: "Post-mortem analysis was undeniably technically competent" }
      ],
      disagreements: [
        { with_agent: "Hiring Manager Agent", point: "Completely dismissing the resume SLA inflation", reason: "Resume wording remains factually misleading without context" }
      ],
      revisions: [
        { aspect: "Candidate Integrity Score", old_position: "Score 68 (Suspected willful exaggeration)", new_position: "Score 74 (Acknowledged technical nuance and candor)", reason: "Candidate demonstrated authentic accountability and post-mortem depth" }
      ],
      remaining_uncertainties: [
        "Did Alex clearly document the read-vs-write SLA distinction to their executive leadership at Apex, or only after the incident occurred?"
      ],
      score_before: 68,
      score_after: 74,
      confidence: "Medium"
    }
  ],

  auditor: {
    overall_reliability: "High",
    confidence: 96,
    issues: [
      {
        agent: "Skeptic Agent",
        issue: "Initial evaluation over-indexed on resume bullet phrasing before weighing the interview's proactive candor.",
        severity: "medium",
        evidence: "Score of 68 did not fully account for candidate's voluntary disclosure of the 3-hour outage in [00:08:12]."
      },
      {
        agent: "Technical Agent",
        issue: "Slightly brushed aside the business implication of a 3-hour write degradation by framing it purely as a technical nuance.",
        severity: "low",
        evidence: "Dismissed the five-nines calculation discrepancy as 'technically standard'."
      }
    ],
    unsupported_reasoning: [],
    bias_risks: [],
    recommended_cautions: [
      "Ensure the human hiring manager explores how the candidate communicates SLA degradations to customer-facing teams.",
      "Verify the boundary between candidate's architectural leadership vs team operational contributions."
    ]
  },

  decision: {
    recommendation: "Strong Hire",
    confidence: 92,
    decision_summary: "The Panel delivers a Strong Hire recommendation for Alex Rivera. Rather than averaging scores, this decision is synthesized by weighing the concrete technical evidence, the candidate's authentic handling of production failures, and their collaborative mentorship record against the Skeptic's valid observations.\n\nThe candidate demonstrated verified Staff-level mastery in distributed consensus (Raft, preemptive quorum checks, Jepsen fault injection), perfectly matching the 2.5M QPS metadata platform requirements. While the Skeptic rightfully identified a discrepancy between the resume's '99.999% uptime' claim and a 3-hour Q3 write outage, the debate resolved the character concern: Alex volunteered the outage unprompted, presented a thorough post-mortem, and implemented automated lease transfer fencing.\n\nThe panel sided with the Technical and Hiring Manager agents because the candidate's demonstrated depth during failure analysis is far more predictive of Staff success than stylized resume phrasing.",
    strengths: [
      "Production mastery of Raft consensus, leaseholder rebalancing, and Jepsen chaos testing",
      "Immediate role alignment: architected 3.1M ops/sec metadata engine matching our 2.5M requirement",
      "Exceptional intellectual honesty and blameless post-mortem leadership",
      "Empowering, hypothesis-driven mentorship methodology for junior engineers"
    ],
    concerns: [
      "Resume bullet points exhibit promotional phrasing regarding uptime metrics that require context",
      "Primary focus is infrastructure/core storage; less direct experience with customer-facing product teams"
    ],
    weighted_reasoning: [
      {
        topic: "Technical Competence & Consensus Depth",
        agent_positions: "Technical (94) & Hiring Manager (93) rated top-tier; Skeptic (74) conceded solid knowledge.",
        synthesis: "The technical evidence is backed by verbatim explanations of adaptive leader leases, Jepsen testing, and eBPF socket tracing.",
        weight_reason: "Core role requirement is fault-tolerant storage architecture."
      },
      {
        topic: "SLA Discrepancy (Five-Nines vs 3-Hour Write Outage)",
        agent_positions: "Skeptic flagged marketing inflation; Technical & HR highlighted proactive candor and post-mortem fix.",
        synthesis: "Candidate volunteered the outage and explained the read-availability distinction. The candor outweighs the resume polish.",
        weight_reason: "Integrity during incident review is paramount for a Staff reliability engineer."
      }
    ],
    resolved_disagreements: [
      {
        issue: "Whether candidate took sole credit for team database migration",
        how_resolved: "Interview transcript confirmed candidate explicitly credited their 4-person strike team and delineated their specific consensus ownership.",
        final_stance: "Candidate demonstrates strong team orientation and intellectual modesty."
      },
      {
        issue: "Whether Skeptic's initial score of 68 represented a critical blocker",
        how_resolved: "Skeptic raised score to 74 after acknowledging post-mortem rigor and authentic transparency during the debate.",
        final_stance: "Skeptic agrees candidate has deep competence but recommends focused interview follow-up on SLA communication."
      }
    ],
    unresolved_disagreements: [
      {
        issue: "How candidate communicates SLA degradations and uptime definitions to non-technical stakeholders and executive leadership",
        agents_involved: ["Skeptic Agent", "Hiring Manager Agent"],
        positions: [
          "Skeptic: Claiming five-nines while write path was down for 3 hours creates risk of misalignment with executive leadership.",
          "Hiring Manager: In internal infrastructure, read vs write SLA partitioning is normal as long as engineering post-mortems are rigorous."
        ],
        why_unresolved: "The transcript does not contain evidence on how Alex presented the Q3 incident to customer-facing business leaders.",
        importance: "medium"
      }
    ],
    human_review_notes: [
      "Ask the candidate how they explain complex infrastructure trade-offs and SLA degradations to non-technical executives.",
      "Probe their experience balancing pure infrastructure priorities with urgent product feature requests."
    ]
  },

  questions: {
    questions: [
      {
        question: "During the Q3 3-hour write degradation at Apex, how did you communicate the outage and SLA impact to customer support and executive stakeholders who may not understand the difference between read and write availability?",
        reason: "Directly resolves the panel's open disagreement between the Skeptic and Hiring Manager regarding SLA communication to non-technical leadership.",
        source_disagreement: "How candidate communicates SLA degradations and uptime definitions to non-technical stakeholders",
        agents_involved: ["Skeptic Agent", "Hiring Manager Agent"]
      },
      {
        question: "When you implemented the adaptive leader lease controller, what was the rollback plan if the preemptive quorum checks introduced unexpected latency in production under peak load?",
        reason: "Validates technical fail-safe thinking for the candidate's primary claimed architecture achievement.",
        source_disagreement: "Exact operational blast radius during consensus leaseholder transitions",
        agents_involved: ["Technical Agent", "Skeptic Agent"]
      }
    ]
  }
};
