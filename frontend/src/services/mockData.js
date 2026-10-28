// Mock Data Store for ReadyUp Aptitude Platform
// Exactly mirrors the ReadyUp API contract (v1.0.0)

export const initialCategories = [
  {
    _id: "cat_quant",
    name: "Quantitative Aptitude",
    slug: "quantitative-aptitude",
    description: "Mathematical, arithmetic, and numerical reasoning topics",
    icon: "Calculator",
    color: "teal",
    questionCount: 148,
    topics: [
      {
        _id: "top_tw",
        name: "Time and Work",
        slug: "time-and-work",
        subtopics: ["Combined Work", "Pipes and Cisterns", "Work and Wages"],
        questionCount: 42
      },
      {
        _id: "top_pl",
        name: "Profit and Loss",
        slug: "profit-and-loss",
        subtopics: ["Discounts & Marked Price", "Successive Discounts", "Partnership"],
        questionCount: 38
      },
      {
        _id: "top_perc",
        name: "Percentages",
        slug: "percentages",
        subtopics: ["Percentage Change", "Population & Depreciation", "Expenditure & Consumption"],
        questionCount: 36
      },
      {
        _id: "top_ratio",
        name: "Ratios & Proportions",
        slug: "ratios-proportions",
        subtopics: ["Direct & Inverse", "Mixtures & Alligations", "Ages"],
        questionCount: 32
      }
    ]
  },
  {
    _id: "cat_logical",
    name: "Logical Reasoning",
    slug: "logical-reasoning",
    description: "Analytical, deductive, inductive, and structural reasoning",
    icon: "Brain",
    color: "amber",
    questionCount: 124,
    topics: [
      {
        _id: "top_syl",
        name: "Syllogisms",
        slug: "syllogisms",
        subtopics: ["Two Statements", "Three Statements", "Possibility Cases"],
        questionCount: 34
      },
      {
        _id: "top_series",
        name: "Number Series",
        slug: "number-series",
        subtopics: ["Difference Series", "Alternating Series", "Pattern Matching"],
        questionCount: 32
      },
      {
        _id: "top_code",
        name: "Coding-Decoding",
        slug: "coding-decoding",
        subtopics: ["Letter Coding", "Number Coding", "Substitution Coding"],
        questionCount: 30
      },
      {
        _id: "top_blood",
        name: "Blood Relations",
        slug: "blood-relations",
        subtopics: ["Coded Relations", "Family Trees", "Pointing to Photographs"],
        questionCount: 28
      }
    ]
  },
  {
    _id: "cat_verbal",
    name: "Verbal Ability",
    slug: "verbal-ability",
    description: "Grammar, reading comprehension, vocabulary, and linguistic accuracy",
    icon: "BookOpen",
    color: "blue",
    questionCount: 110,
    topics: [
      {
        _id: "top_gram",
        name: "Grammar & Error Spotting",
        slug: "grammar-error-spotting",
        subtopics: ["Subject-Verb Agreement", "Tenses", "Prepositions & Articles"],
        questionCount: 38
      },
      {
        _id: "top_vocab",
        name: "Vocabulary & Synonyms",
        slug: "vocabulary-synonyms",
        subtopics: ["Contextual Meanings", "Antonyms", "One Word Substitution"],
        questionCount: 36
      },
      {
        _id: "top_para",
        name: "Para Jumbles & Sentence Ordering",
        slug: "para-jumbles",
        subtopics: ["Mandatory Pairs", "Introductory Sentences", "Logical Flow"],
        questionCount: 36
      }
    ]
  },
  {
    _id: "cat_di",
    name: "Data Interpretation",
    slug: "data-interpretation",
    description: "Tabular, graphical, pie-chart, and caselet analytical sets",
    icon: "BarChart3",
    color: "emerald",
    questionCount: 88,
    topics: [
      {
        _id: "top_tables",
        name: "Tables & Spreadsheets",
        slug: "tables-spreadsheets",
        subtopics: ["Growth Rates", "Cross-tabulation", "Weighted Averages"],
        questionCount: 30
      },
      {
        _id: "top_bar",
        name: "Bar & Line Charts",
        slug: "bar-line-charts",
        subtopics: ["Trend Analysis", "Comparative Growth", "Break-even Points"],
        questionCount: 30
      },
      {
        _id: "top_pie",
        name: "Pie Charts & Caselets",
        slug: "pie-charts",
        subtopics: ["Degree Conversion", "Multi-tier Distribution", "Ratio Distributions"],
        questionCount: 28
      }
    ]
  }
];

export const initialQuestions = [
  {
    _id: "670cfa3410a8b92d6e3f4150",
    questionId: "QA-TW-001",
    questionText: "A can complete a piece of work in 12 days, while B can complete the same work in 18 days. If they work together for 4 days, what fraction of the work remains unfinished?",
    options: [
      { optionId: "A", text: "4/9" },
      { optionId: "B", text: "5/9" },
      { optionId: "C", text: "1/3" },
      { optionId: "D", text: "2/5" }
    ],
    correctOption: "A",
    explanation: "A's 1-day work = 1/12. B's 1-day work = 1/18.\nCombined 1-day work = 1/12 + 1/18 = 5/36.\nWork completed in 4 days = 4 * (5/36) = 20/36 = 5/9.\nRemaining work = 1 - 5/9 = 4/9.",
    category: "Quantitative Aptitude",
    topic: "Time and Work",
    subtopic: "Combined Work",
    difficulty: "easy",
    companies: ["TCS", "Infosys"],
    source: "TCS NQT 2024",
    year: 2024,
    isVerified: true,
    isActive: true
  },
  {
    _id: "670cfa3410a8b92d6e3f4151",
    questionId: "QA-TW-002",
    questionText: "Pipe A can fill a tank in 20 hours, and Pipe B can fill it in 30 hours. Both pipes are opened together. When the tank is half full, a leak develops which drains one-third of the water supplied by both pipes. What is the total time required to fill the tank?",
    options: [
      { optionId: "A", text: "12 hours" },
      { optionId: "B", text: "14 hours" },
      { optionId: "C", text: "15 hours" },
      { optionId: "D", text: "16 hours" }
    ],
    correctOption: "C",
    explanation: "Rate of A = 1/20, Rate of B = 1/30. Combined rate = 1/20 + 1/30 = 1/12 tank/hr.\nTime to fill first half = (1/2) / (1/12) = 6 hours.\nEffective filling rate with leak draining 1/3 = (2/3) * (1/12) = 1/18 tank/hr.\nTime to fill remaining half = (1/2) / (1/18) = 9 hours.\nTotal time = 6 + 9 = 15 hours.",
    category: "Quantitative Aptitude",
    topic: "Time and Work",
    subtopic: "Pipes and Cisterns",
    difficulty: "medium",
    companies: ["Accenture", "Cognizant"],
    source: "Cognizant GenC 2024",
    year: 2024,
    isVerified: true,
    isActive: true
  },
  {
    _id: "670cfa3410a8b92d6e3f4152",
    questionId: "QA-PL-001",
    questionText: "A merchant marks his goods 40% above cost price and allows a discount of 25% on the marked price. In addition, he uses a faulty weight that weighs 900 grams instead of 1000 grams while selling. What is his overall profit percentage?",
    options: [
      { optionId: "A", text: "14.4%" },
      { optionId: "B", text: "16.67%" },
      { optionId: "C", text: "18.2%" },
      { optionId: "D", text: "20.0%" }
    ],
    correctOption: "B",
    explanation: "Let CP of 1000g = ₹100. Marked Price = ₹140.\nSelling Price after 25% discount = 140 * 0.75 = ₹105.\nFor ₹105, he only delivers 900g, whose true cost is ₹90.\nProfit = ₹105 - ₹90 = ₹15 on cost ₹90.\nProfit % = (15 / 90) * 100 = 16.67%.",
    category: "Quantitative Aptitude",
    topic: "Profit and Loss",
    subtopic: "Discounts & Marked Price",
    difficulty: "hard",
    companies: ["TCS", "Capgemini"],
    source: "TCS Digital 2024",
    year: 2024,
    isVerified: true,
    isActive: true
  },
  {
    _id: "670cfa3410a8b92d6e3f4153",
    questionId: "QA-PERC-001",
    questionText: "In an engineering examination, 65% of students passed in Numerical Ability, 60% passed in Logical Reasoning, and 40% passed in both. If 90 students failed in both sections, what was the total number of students who appeared?",
    options: [
      { optionId: "A", text: "500" },
      { optionId: "B", text: "600" },
      { optionId: "C", text: "750" },
      { optionId: "D", text: "900" }
    ],
    correctOption: "B",
    explanation: "Passed in at least one = P(N) + P(L) - P(N ∩ L) = 65% + 60% - 40% = 85%.\nFailed in both = 100% - 85% = 15%.\nGiven 15% = 90 students.\nTotal students = 90 / 0.15 = 600 students.",
    category: "Quantitative Aptitude",
    topic: "Percentages",
    subtopic: "Percentage Change",
    difficulty: "easy",
    companies: ["Infosys", "Wipro"],
    source: "Infosys Campus 2023",
    year: 2023,
    isVerified: true,
    isActive: true
  },
  {
    _id: "670cfa3410a8b92d6e3f4154",
    questionId: "LR-SY-001",
    questionText: "Statements:\n1. All algorithms are programs.\n2. Some programs are scripts.\nConclusions:\nI. Some algorithms are scripts.\nII. Some scripts are programs.",
    options: [
      { optionId: "A", text: "Only Conclusion I follows" },
      { optionId: "B", text: "Only Conclusion II follows" },
      { optionId: "C", text: "Either I or II follows" },
      { optionId: "D", text: "Neither I nor II follows" }
    ],
    correctOption: "B",
    explanation: "From Statement 2: 'Some programs are scripts' naturally converts to 'Some scripts are programs' by simple conversion of 'Some'. Thus Conclusion II follows.\nThere is no direct connection establishing that algorithms must overlap with scripts, so Conclusion I does not necessarily follow.",
    category: "Logical Reasoning",
    topic: "Syllogisms",
    subtopic: "Two Statements",
    difficulty: "easy",
    companies: ["TCS", "Accenture", "Cognizant"],
    source: "TCS NQT 2024",
    year: 2024,
    isVerified: true,
    isActive: true
  },
  {
    _id: "670cfa3410a8b92d6e3f4155",
    questionId: "LR-SER-001",
    questionText: "Find the next missing number in the sequence: 4, 18, 48, 100, 180, ?",
    options: [
      { optionId: "A", text: "256" },
      { optionId: "B", text: "284" },
      { optionId: "C", text: "294" },
      { optionId: "D", text: "312" }
    ],
    correctOption: "C",
    explanation: "Notice the pattern:\n1^2 * 4 = 4\n2^2 * (something)? Or n^3 - n^2:\n2^3 - 2^2 = 8 - 4 = 4\n3^3 - 3^2 = 27 - 9 = 18\n4^3 - 4^2 = 64 - 16 = 48\n5^3 - 5^2 = 125 - 25 = 100\n6^3 - 6^2 = 216 - 36 = 180\n7^3 - 7^2 = 343 - 49 = 294.",
    category: "Logical Reasoning",
    topic: "Number Series",
    subtopic: "Pattern Matching",
    difficulty: "medium",
    companies: ["Capgemini", "Infosys"],
    source: "Capgemini Excellence 2024",
    year: 2024,
    isVerified: true,
    isActive: true
  },
  {
    _id: "670cfa3410a8b92d6e3f4156",
    questionId: "VA-GR-001",
    questionText: "Identify the part of the sentence with an error: 'Neither the team lead (A) nor the developers (B) was prepared for (C) the sudden server outage (D).'",
    options: [
      { optionId: "A", text: "Part A" },
      { optionId: "B", text: "Part B" },
      { optionId: "C", text: "Part C ('was prepared for')" },
      { optionId: "D", text: "Part D" }
    ],
    correctOption: "C",
    explanation: "When two subjects are connected by 'neither... nor', the verb must agree with the subject closest to it. Here 'developers' is plural, so the verb must be 'were prepared for', not 'was prepared for'.",
    category: "Verbal Ability",
    topic: "Grammar & Error Spotting",
    subtopic: "Subject-Verb Agreement",
    difficulty: "easy",
    companies: ["TCS", "Wipro", "Cognizant"],
    source: "Wipro Elite NTH 2024",
    year: 2024,
    isVerified: true,
    isActive: true
  },
  {
    _id: "670cfa3410a8b92d6e3f4157",
    questionId: "DI-TB-001",
    questionText: "A software firm's cloud spend across four quarters was: Q1: $40,000, Q2: $52,000, Q3: $65,000, Q4: $78,000. What was the percentage increase in expenditure from Q1 to Q4?",
    options: [
      { optionId: "A", text: "85%" },
      { optionId: "B", text: "95%" },
      { optionId: "C", text: "92.5%" },
      { optionId: "D", text: "105%" }
    ],
    correctOption: "B",
    explanation: "Increase = $78,000 - $40,000 = $38,000.\nPercentage Increase = (38,000 / 40,000) * 100 = 95%.",
    category: "Data Interpretation",
    topic: "Tables & Spreadsheets",
    subtopic: "Growth Rates",
    difficulty: "easy",
    companies: ["Accenture", "TCS"],
    source: "Accenture Cognitive 2024",
    year: 2024,
    isVerified: true,
    isActive: true
  }
];

export const initialCompanies = [
  {
    _id: "comp_tcs",
    name: "TCS",
    slug: "tcs",
    tagline: "Tata Consultancy Services - National Qualifier Test",
    description: "TCS NQT evaluates cognitive foundation skills across Numerical Ability, Reasoning Ability, and Verbal Ability for Ninja & Digital profiles.",
    hiringPattern: "Numerical Ability (26 Qs, 40 mins), Reasoning Ability (30 Qs, 50 mins), Verbal Ability (24 Qs, 30 mins).",
    eligibilityNotes: "60% or 6.0 CGPA throughout 10th, 12th, and B.Tech. Maximum 1 back-log permitted at registration.",
    questionCount: 140,
    mockTestCount: 4,
    color: "#0284c7",
    badge: "Tier-1 Recruiter",
    rounds: [
      { name: "Cognitive Aptitude", duration: "120 mins", questions: 80 },
      { name: "Advanced Coding (Digital only)", duration: "90 mins", questions: 2 }
    ],
    keyTopics: ["Time and Work", "Profit and Loss", "Syllogisms", "Grammar", "Data Interpretation"],
    isActive: true
  },
  {
    _id: "comp_infy",
    name: "Infosys",
    slug: "infosys",
    tagline: "Infosys Special Test & Systems Engineer Aptitude",
    description: "Infosys placement exam tests Mathematical Critical Thinking, Logical Reasoning, and Verbal Comprehension with sectional cutoffs.",
    hiringPattern: "Mathematical Ability (10 Qs, 35 mins), Reasoning Ability (15 Qs, 25 mins), Verbal Ability (20 Qs, 20 mins).",
    eligibilityNotes: "65% or 6.5 CGPA in graduation, no active backlogs.",
    questionCount: 115,
    mockTestCount: 3,
    color: "#0284c7",
    badge: "Mass Recruiter",
    rounds: [
      { name: "Reasoning & Math Drill", duration: "80 mins", questions: 45 },
      { name: "Technical Evaluation", duration: "45 mins", questions: "Interview" }
    ],
    keyTopics: ["Percentages", "Number Series", "Para Jumbles", "Ratios"],
    isActive: true
  },
  {
    _id: "comp_acc",
    name: "Accenture",
    slug: "accenture",
    tagline: "Accenture Cognitive Assessment & Critical Thinking",
    description: "Covers Critical Thinking, Problem Solving, Abstract Reasoning, and Technical fundamentals with strict time-management requirements.",
    hiringPattern: "English Ability (17 Qs), Critical Reasoning & Problem Solving (18 Qs), Abstract Reasoning (15 Qs) in 90 mins.",
    eligibilityNotes: "65% or 6.5 CGPA with zero active backlogs. 1-year academic gap tolerated.",
    questionCount: 95,
    mockTestCount: 3,
    color: "#a855f7",
    badge: "High Intake",
    rounds: [
      { name: "Cognitive & Technical Assessment", duration: "90 mins", questions: 90 },
      { name: "Coding Test", duration: "45 mins", questions: 2 }
    ],
    keyTopics: ["Syllogisms", "Blood Relations", "Tables & Spreadsheets", "Sentence Ordering"],
    isActive: true
  },
  {
    _id: "comp_cog",
    name: "Cognizant",
    slug: "cognizant",
    tagline: "Cognizant GenC & GenC Next Aptitude Assessment",
    description: "Tests Quantitative Ability, Analytical Reasoning, and Verbal Ability on platforms like AMCAT/Superset.",
    hiringPattern: "Quantitative Ability (25 Qs, 35 mins), Logical Ability (25 Qs, 35 mins), English Comprehension (20 Qs, 20 mins).",
    eligibilityNotes: "60% aggregate in 10th, 12th, and UG. Up to 2 years education gap allowed.",
    questionCount: 88,
    mockTestCount: 2,
    color: "#0d9488",
    badge: "IT Services",
    rounds: [
      { name: "General Aptitude Test", duration: "90 mins", questions: 70 },
      { name: "Technical Communication", duration: "30 mins", questions: 20 }
    ],
    keyTopics: ["Pipes and Cisterns", "Coding-Decoding", "Error Spotting"],
    isActive: true
  },
  {
    _id: "comp_cap",
    name: "Capgemini",
    slug: "capgemini",
    tagline: "Capgemini Exceller Aptitude & Game-Based Assessment",
    description: "Focuses on Pseudo-code analysis, English Communication, and Game-based Cognitive aptitude tests.",
    hiringPattern: "English Communication (30 Qs, 30 mins), Analytical & Quantitative (16 Qs, 25 mins), Pseudo Code (25 Qs).",
    eligibilityNotes: "60% throughout academics, branch-specific criteria apply.",
    questionCount: 76,
    mockTestCount: 2,
    color: "#0369a1",
    badge: "Multinational",
    rounds: [
      { name: "Aptitude + PseudoCode", duration: "75 mins", questions: 71 },
      { name: "Game-Based Aptitude", duration: "30 mins", questions: "4 Mini-games" }
    ],
    keyTopics: ["Profit & Loss", "Number Patterns", "Vocabulary"],
    isActive: true
  },
  {
    _id: "comp_wipro",
    name: "Wipro",
    slug: "wipro",
    tagline: "Wipro Elite National Talent Hunt (NTH)",
    description: "Standardized recruitment test for Project Engineer roles featuring Quantitative, Logical, and Essay Writing.",
    hiringPattern: "Quantitative Ability (16 Qs, 16 mins), Logical Ability (14 Qs, 14 mins), Verbal Ability (22 Qs, 18 mins).",
    eligibilityNotes: "60% in 10th and 12th, 6.0 CGPA or 60% in engineering.",
    questionCount: 82,
    mockTestCount: 2,
    color: "#e11d48",
    badge: "Campus Recruiter",
    rounds: [
      { name: "Aptitude Test", duration: "48 mins", questions: 52 },
      { name: "Online Essay Assessment", duration: "20 mins", questions: 1 }
    ],
    keyTopics: ["Time and Work", "Percentages", "Grammar"],
    isActive: true
  }
];

export const initialMockTests = [
  {
    _id: "mock_tcs_01",
    title: "TCS NQT National Mock 1",
    slug: "tcs-nqt-national-mock-1",
    company: "TCS",
    type: "company_mock",
    durationMinutes: 45,
    totalQuestions: 10,
    totalMarks: 10,
    passingMarks: 6,
    instructions: [
      "Each question carries 1 mark. There is no negative marking for this mock.",
      "You cannot return to previous questions after the timer expires.",
      "Submit before the timer hits 00:00 to record your performance.",
      "Avoid switching tabs or refreshing during the test."
    ],
    questionIds: ["QA-TW-001", "QA-TW-002", "QA-PL-001", "QA-PERC-001", "LR-SY-001", "LR-SER-001", "VA-GR-001", "DI-TB-001"]
  },
  {
    _id: "mock_infy_01",
    title: "Infosys Diagnostic Assessment 1",
    slug: "infosys-diagnostic-1",
    company: "Infosys",
    type: "company_mock",
    durationMinutes: 30,
    totalQuestions: 8,
    totalMarks: 8,
    passingMarks: 5,
    instructions: [
      "Tests speed and precision across numerical patterns and syllogisms.",
      "Calculators are not permitted.",
      "Ensure an uninterrupted internet connection."
    ],
    questionIds: ["QA-TW-001", "QA-PERC-001", "LR-SY-001", "LR-SER-001", "VA-GR-001"]
  },
  {
    _id: "mock_quant_speed",
    title: "Quantitative Speed Drill",
    slug: "quantitative-speed-drill",
    company: "General",
    type: "topic_test",
    durationMinutes: 20,
    totalQuestions: 6,
    totalMarks: 6,
    passingMarks: 4,
    instructions: [
      "Focuses on arithmetic shortcuts: Time & Work, Profit & Loss, Percentages.",
      "Ideal for daily 20-minute practice."
    ],
    questionIds: ["QA-TW-001", "QA-TW-002", "QA-PL-001", "QA-PERC-001"]
  }
];

export const initialStudentData = {
  student: {
    _id: "usr_student_01",
    name: "Aarav Sharma",
    email: "student@readyup.edu",
    role: "student",
    department: "Computer Science & Engineering",
    college: "National Institute of Technology",
    graduationYear: 2026,
    studentId: "CS2026-042",
    isActive: true
  },
  metrics: [
    {
      id: "tests_attempted",
      label: "Tests Completed",
      value: "14",
      subtext: "3 this week",
      icon: "FileCheck",
      color: "teal"
    },
    {
      id: "avg_accuracy",
      label: "Average Accuracy",
      value: "74.5%",
      subtext: "Across all topics",
      icon: "Target",
      color: "amber"
    },
    {
      id: "practice_time",
      label: "Study Time",
      value: "8.2 hrs",
      subtext: "Active practice time",
      icon: "Clock",
      color: "blue"
    },
    {
      id: "pass_rate",
      label: "Pass Rate",
      value: "85.7%",
      subtext: "12 of 14 passed",
      icon: "Award",
      color: "emerald"
    }
  ],
  nextBestAction: {
    label: "NEXT BEST ACTION",
    title: "Practice Time and Work",
    description: "Your accuracy in Time and Work is currently 50%. Solve a curated 10-question practice set to build speed and accuracy before upcoming drives.",
    ctaText: "Start Practice →",
    actionType: "PRACTICE",
    targetTopic: "Time and Work",
    targetCategory: "Quantitative Aptitude"
  },
  weeklyProgress: {
    percentage: 75,
    current: 3,
    target: 4,
    label: "Weekly Mock Test Goal",
    subtext: "1 test remaining this week"
  },
  categoryBreakdown: [
    { category: "Quantitative Aptitude", accuracy: 72, totalAttempted: 60 },
    { category: "Logical Reasoning", accuracy: 80, totalAttempted: 45 },
    { category: "Verbal Ability", accuracy: 78, totalAttempted: 35 },
    { category: "Data Interpretation", accuracy: 68, totalAttempted: 28 }
  ],
  weakTopics: [
    { topic: "Time and Work", category: "Quantitative Aptitude", totalQuestions: 10, accuracy: 50 },
    { topic: "Data Interpretation - Tables", category: "Data Interpretation", totalQuestions: 8, accuracy: 55 },
    { topic: "Pipes & Cisterns", category: "Quantitative Aptitude", totalQuestions: 6, accuracy: 58 }
  ],
  strongTopics: [
    { topic: "Percentages", category: "Quantitative Aptitude", totalQuestions: 12, accuracy: 83 },
    { topic: "Syllogisms", category: "Logical Reasoning", totalQuestions: 15, accuracy: 87 },
    { topic: "Grammar & Error Spotting", category: "Verbal Ability", totalQuestions: 14, accuracy: 85 }
  ],
  recentAttempts: [
    {
      id: "att_001",
      title: "TCS NQT National Mock 1",
      type: "mock_test",
      submittedAt: "2026-10-14T15:30:00.000Z",
      score: 8,
      totalMarks: 10,
      percentage: 80.0,
      passed: true,
      statusBadge: "Passed"
    },
    {
      id: "att_002",
      title: "Infosys Diagnostic Assessment 1",
      type: "mock_test",
      submittedAt: "2026-10-12T11:15:00.000Z",
      score: 4,
      totalMarks: 8,
      percentage: 50.0,
      passed: false,
      statusBadge: "Needs Review"
    },
    {
      id: "att_003",
      title: "Practice: Logical Reasoning Drill",
      type: "practice",
      submittedAt: "2026-10-10T18:45:00.000Z",
      score: 9,
      totalMarks: 10,
      percentage: 90.0,
      passed: true,
      statusBadge: "Passed"
    }
  ],
  bookmarkCount: 4
};

export const initialBookmarks = [
  {
    _id: "bmk_001",
    questionId: "QA-TW-001",
    note: "Revise 1-day work fraction formula before TCS exam",
    createdAt: "2026-10-13T09:20:00.000Z",
    question: initialQuestions[0]
  },
  {
    _id: "bmk_002",
    questionId: "QA-PL-001",
    note: "Faulty weight formula: True Cost vs Delivered Grams calculation",
    createdAt: "2026-10-12T14:40:00.000Z",
    question: initialQuestions[2]
  },
  {
    _id: "bmk_003",
    questionId: "LR-SER-001",
    note: "Pattern is n^3 - n^2! Remember 294 for 7^3 - 7^2",
    createdAt: "2026-10-11T16:10:00.000Z",
    question: initialQuestions[5]
  }
];

export const initialCoordinatorData = {
  metrics: [
    { label: "Total Question Bank", value: 470, subtext: "+45 imported this week", icon: "BookOpen", color: "teal" },
    { label: "Active Aptitude Topics", value: 15, subtext: "Across 4 categories", icon: "FolderGit2", color: "blue" },
    { label: "Target Companies", value: 6, subtext: "Verified test patterns", icon: "Building2", color: "amber" },
    { label: "Spreadsheet Imports", value: 18, subtext: "100% parsed successfully", icon: "FileSpreadsheet", color: "emerald" }
  ],
  importHistory: [
    {
      importBatchId: "batch_1760441500000_a8bc12",
      filename: "tcs_nqt_2026_quant_set.xlsx",
      uploadedAt: "2026-10-14T14:20:00.000Z",
      uploaderName: "Prof. Sunita Patil",
      status: "published",
      totalRows: 25,
      insertedCount: 20,
      updatedCount: 5,
      failedCount: 0
    },
    {
      importBatchId: "batch_1760341500000_b9cd34",
      filename: "infosys_verbal_reasoning_2025.csv",
      uploadedAt: "2026-10-11T10:15:00.000Z",
      uploaderName: "Prof. Sunita Patil",
      status: "published",
      totalRows: 30,
      insertedCount: 28,
      updatedCount: 2,
      failedCount: 0
    },
    {
      importBatchId: "batch_1760241500000_c1ef56",
      filename: "accenture_critical_thinking.xlsx",
      uploadedAt: "2026-10-08T16:40:00.000Z",
      uploaderName: "Prof. Sunita Patil",
      status: "published",
      totalRows: 15,
      insertedCount: 15,
      updatedCount: 0,
      failedCount: 0
    }
  ]
};

export const initialAdminData = {
  metrics: [
    { label: "Registered Students", value: 1240, subtext: "+68 this month", icon: "GraduationCap", color: "teal" },
    { label: "T&P Coordinators", value: 6, subtext: "Active staff members", icon: "ShieldCheck", color: "amber" },
    { label: "Mock Test Attempts", value: 3840, subtext: "Average accuracy 72.1%", icon: "Activity", color: "blue" },
    { label: "Platform Pass Rate", value: "79.4%", subtext: "Across all drives", icon: "TrendingUp", color: "emerald" }
  ],
  users: [
    {
      _id: "usr_student_01",
      name: "Aarav Sharma",
      email: "student@readyup.edu",
      role: "student",
      department: "Computer Science & Engineering",
      college: "National Institute of Technology",
      graduationYear: 2026,
      studentId: "CS2026-042",
      isActive: true,
      lastLoginAt: "2026-10-14T17:05:00.000Z"
    },
    {
      _id: "usr_coord_01",
      name: "Prof. Sunita Patil",
      email: "coordinator@readyup.edu",
      role: "coordinator",
      department: "Training & Placement Cell",
      college: "National Institute of Technology",
      studentId: "EMP-TP-04",
      isActive: true,
      lastLoginAt: "2026-10-14T16:20:00.000Z"
    },
    {
      _id: "usr_admin_01",
      name: "Dr. Vikram Malhotra",
      email: "admin@readyup.edu",
      role: "admin",
      department: "Dean Office & Academics",
      college: "National Institute of Technology",
      studentId: "EMP-ADM-01",
      isActive: true,
      lastLoginAt: "2026-10-14T17:30:00.000Z"
    },
    {
      _id: "usr_student_02",
      name: "Neha Deshmukh",
      email: "neha.d@readyup.edu",
      role: "student",
      department: "Information Technology",
      college: "National Institute of Technology",
      graduationYear: 2026,
      studentId: "IT2026-019",
      isActive: true,
      lastLoginAt: "2026-10-13T18:10:00.000Z"
    },
    {
      _id: "usr_student_03",
      name: "Rohan Verma",
      email: "rohan.v@readyup.edu",
      role: "student",
      department: "Electronics & Communication",
      college: "National Institute of Technology",
      graduationYear: 2026,
      studentId: "EC2026-085",
      isActive: false,
      lastLoginAt: "2026-10-05T12:00:00.000Z"
    }
  ],
  auditLogs: [
    {
      _id: "log_001",
      action: "USER_LOGIN",
      performedBy: "Dr. Vikram Malhotra (admin@readyup.edu)",
      targetType: "AUTH",
      details: "Successful admin authentication from campus intranet",
      ipAddress: "192.168.1.10",
      timestamp: "2026-10-14T17:30:00.000Z"
    },
    {
      _id: "log_002",
      action: "SPREADSHEET_IMPORT_CONFIRMED",
      performedBy: "Prof. Sunita Patil (coordinator@readyup.edu)",
      targetType: "QUESTION_BANK",
      details: "Published 25 questions from batch_1760441500000_a8bc12 (tcs_nqt_2026_quant_set.xlsx)",
      ipAddress: "192.168.1.45",
      timestamp: "2026-10-14T14:20:00.000Z"
    },
    {
      _id: "log_003",
      action: "USER_STATUS_CHANGE",
      performedBy: "Dr. Vikram Malhotra (admin@readyup.edu)",
      targetType: "USER",
      details: "Deactivated student account Rohan Verma (rohan.v@readyup.edu) due to semester transfer",
      ipAddress: "192.168.1.10",
      timestamp: "2026-10-13T11:05:00.000Z"
    },
    {
      _id: "log_004",
      action: "ROLE_ASSIGNED",
      performedBy: "Dr. Vikram Malhotra (admin@readyup.edu)",
      targetType: "USER",
      details: "Promoted Prof. Sunita Patil to coordinator role",
      ipAddress: "192.168.1.10",
      timestamp: "2026-10-01T09:00:00.000Z"
    }
  ]
};
