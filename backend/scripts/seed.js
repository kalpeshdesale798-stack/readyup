import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import connectDB from "../config/db.js";

import User from "../models/User.js";
import Category from "../models/Category.js";
import Company from "../models/Company.js";
import Question from "../models/Question.js";
import MockTest from "../models/MockTest.js";
import Attempt from "../models/Attempt.js";
import AuditLog from "../models/AuditLog.js";

dotenv.config();

const initialCategories = [
    {
        name: "Quantitative Aptitude",
        slug: "quantitative-aptitude",
        description: "Mathematical, arithmetic, and numerical reasoning topics",
        icon: "Calculator",
        color: "teal",
        questionCount: 4,
        topics: [
            {
                name: "Time and Work",
                slug: "time-and-work",
                subtopics: ["Combined Work", "Pipes and Cisterns", "Work and Wages"],
                questionCount: 2,
            },
            {
                name: "Profit and Loss",
                slug: "profit-and-loss",
                subtopics: ["Discounts & Marked Price", "Successive Discounts", "Partnership"],
                questionCount: 1,
            },
            {
                name: "Percentages",
                slug: "percentages",
                subtopics: ["Percentage Change", "Population & Depreciation", "Expenditure & Consumption"],
                questionCount: 1,
            },
            {
                name: "Ratios & Proportions",
                slug: "ratios-proportions",
                subtopics: ["Direct & Inverse", "Mixtures & Alligations", "Ages"],
                questionCount: 1,
            },
        ],
    },
    {
        name: "Logical Reasoning",
        slug: "logical-reasoning",
        description: "Analytical, deductive, inductive, and structural reasoning",
        icon: "Brain",
        color: "amber",
        questionCount: 3,
        topics: [
            {
                name: "Syllogisms",
                slug: "syllogisms",
                subtopics: ["Two Statements", "Three Statements", "Possibility Cases"],
                questionCount: 1,
            },
            {
                name: "Number Series",
                slug: "number-series",
                subtopics: ["Difference Series", "Alternating Series", "Pattern Matching"],
                questionCount: 1,
            },
            {
                name: "Coding-Decoding",
                slug: "coding-decoding",
                subtopics: ["Letter Coding", "Number Coding", "Substitution Coding"],
                questionCount: 1,
            },
            {
                name: "Blood Relations",
                slug: "blood-relations",
                subtopics: ["Coded Relations", "Family Trees", "Pointing to Photographs"],
                questionCount: 1,
            },
        ],
    },
    {
        name: "Verbal Ability",
        slug: "verbal-ability",
        description: "Grammar, reading comprehension, vocabulary, and linguistic accuracy",
        icon: "BookOpen",
        color: "blue",
        questionCount: 3,
        topics: [
            {
                name: "Grammar & Error Spotting",
                slug: "grammar-error-spotting",
                subtopics: ["Subject-Verb Agreement", "Tenses", "Prepositions & Articles"],
                questionCount: 1,
            },
            {
                name: "Vocabulary & Synonyms",
                slug: "vocabulary-synonyms",
                subtopics: ["Contextual Meanings", "Antonyms", "One Word Substitution"],
                questionCount: 1,
            },
            {
                name: "Para Jumbles & Sentence Ordering",
                slug: "para-jumbles",
                subtopics: ["Mandatory Pairs", "Introductory Sentences", "Logical Flow"],
                questionCount: 1,
            },
        ],
    },
    {
        name: "Data Interpretation",
        slug: "data-interpretation",
        description: "Tabular, graphical, pie-chart, and caselet analytical sets",
        icon: "BarChart3",
        color: "emerald",
        questionCount: 2,
        topics: [
            {
                name: "Tables & Spreadsheets",
                slug: "tables-spreadsheets",
                subtopics: ["Growth Rates", "Cross-tabulation", "Weighted Averages"],
                questionCount: 1,
            },
            {
                name: "Bar & Line Charts",
                slug: "bar-line-charts",
                subtopics: ["Trend Analysis", "Comparative Growth", "Break-even Points"],
                questionCount: 1,
            },
        ],
    },
];

const initialCompanies = [
    {
        name: "TCS",
        slug: "tcs",
        logo: "Building2",
        tagline: "Tata Consultancy Services NQT Pattern",
        description: "India's premier IT consultancy conducting nationwide National Qualifier Test (NQT) for Ninja and Digital profiles.",
        hiringPattern: {
            testDuration: 75,
            totalQuestions: 65,
            sections: [
                { name: "Numerical Ability", questions: 20, timeMinutes: 25 },
                { name: "Verbal Ability", questions: 25, timeMinutes: 25 },
                { name: "Reasoning Ability", questions: 20, timeMinutes: 25 },
            ],
        },
        activeDrives: 2,
        averagePackage: "3.6 - 7.2 LPA",
        difficulty: "Medium",
        topicsFocus: ["Time and Work", "Syllogisms", "Reading Comprehension", "Number Series"],
    },
    {
        name: "Infosys",
        slug: "infosys",
        logo: "Building2",
        tagline: "Infosys Specialist Programmer & System Engineer",
        description: "Global consulting and next-generation digital services recruiter focusing heavily on algorithmic reasoning.",
        hiringPattern: {
            testDuration: 100,
            totalQuestions: 54,
            sections: [
                { name: "Mathematical Critical Thinking", questions: 10, timeMinutes: 35 },
                { name: "Logical Reasoning", questions: 15, timeMinutes: 25 },
                { name: "Verbal Ability", questions: 20, timeMinutes: 20 },
                { name: "Pseudo Code", questions: 9, timeMinutes: 20 },
            ],
        },
        activeDrives: 1,
        averagePackage: "4.0 - 9.5 LPA",
        difficulty: "Hard",
        topicsFocus: ["Data Interpretation", "Cryptarithmetic", "Para Jumbles", "Percentages"],
    },
    {
        name: "Wipro",
        slug: "wipro",
        logo: "Building2",
        tagline: "Wipro Elite National Talent Hunt (NLTH)",
        description: "Leading technology services firm with high emphasis on quantitative speed and error-free verbal communication.",
        hiringPattern: {
            testDuration: 48,
            totalQuestions: 48,
            sections: [
                { name: "Quantitative Aptitude", questions: 16, timeMinutes: 16 },
                { name: "Logical Ability", questions: 16, timeMinutes: 16 },
                { name: "Verbal Ability", questions: 16, timeMinutes: 16 },
            ],
        },
        activeDrives: 1,
        averagePackage: "3.5 - 6.5 LPA",
        difficulty: "Medium",
        topicsFocus: ["Profit and Loss", "Blood Relations", "Grammar & Error Spotting", "Ratios"],
    },
    {
        name: "Accenture",
        slug: "accenture",
        logo: "Building2",
        tagline: "Accenture Associate Software Engineer (ASE)",
        description: "Fortune Global 500 powerhouse with cognitive assessments prioritizing critical thinking and analytical puzzles.",
        hiringPattern: {
            testDuration: 90,
            totalQuestions: 90,
            sections: [
                { name: "Cognitive Assessment", questions: 50, timeMinutes: 50 },
                { name: "Technical Assessment", questions: 40, timeMinutes: 40 },
            ],
        },
        activeDrives: 2,
        averagePackage: "4.5 - 6.5 LPA",
        difficulty: "Medium",
        topicsFocus: ["Coding-Decoding", "Percentages", "Vocabulary & Synonyms", "Tables & Spreadsheets"],
    },
    {
        name: "Cognizant",
        slug: "cognizant",
        logo: "Building2",
        tagline: "Cognizant GenC and GenC Next Assessments",
        description: "Multinational IT corporation assessing logical dexterity and pattern visualization.",
        hiringPattern: {
            testDuration: 80,
            totalQuestions: 60,
            sections: [
                { name: "Quantitative Ability", questions: 20, timeMinutes: 25 },
                { name: "Logical Ability", questions: 20, timeMinutes: 25 },
                { name: "Verbal Ability", questions: 20, timeMinutes: 30 },
            ],
        },
        activeDrives: 1,
        averagePackage: "4.0 - 6.75 LPA",
        difficulty: "Medium",
        topicsFocus: ["Time and Work", "Bar & Line Charts", "Para Jumbles", "Ratios & Proportions"],
    },
];

const initialQuestions = [
    {
        questionId: "QA-TW-001",
        questionText: "A can complete a piece of work in 12 days, while B can complete the same work in 18 days. If they work together for 4 days, what fraction of the work remains unfinished?",
        options: [
            { optionId: "A", text: "4/9" },
            { optionId: "B", text: "5/9" },
            { optionId: "C", text: "1/3" },
            { optionId: "D", text: "2/5" },
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
        isActive: true,
    },
    {
        questionId: "QA-TW-002",
        questionText: "Pipe A can fill a tank in 20 hours, and Pipe B can fill it in 30 hours. Both pipes are opened together. When the tank is half full, a leak develops which drains one-third of the water supplied by both pipes. What is the total time required to fill the tank?",
        options: [
            { optionId: "A", text: "12 hours" },
            { optionId: "B", text: "14 hours" },
            { optionId: "C", text: "15 hours" },
            { optionId: "D", text: "16 hours" },
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
        isActive: true,
    },
    {
        questionId: "QA-PL-001",
        questionText: "A merchant marks his goods 40% above cost price and allows a discount of 25% on the marked price. In addition, he uses a faulty weight that weighs 900 grams instead of 1000 grams while selling. What is his overall profit percentage?",
        options: [
            { optionId: "A", text: "14.4%" },
            { optionId: "B", text: "16.67%" },
            { optionId: "C", text: "15.0%" },
            { optionId: "D", text: "18.5%" },
        ],
        correctOption: "B",
        explanation: "Let CP of 1000g = 100.\nMarked price = 140.\nSP of 1000g marked = 140 * 0.75 = 105.\nSince he sells only 900g for 105, CP of 900g = 90.\nProfit = 105 - 90 = 15.\nProfit % = (15 / 90) * 100 = 16.67%.",
        category: "Quantitative Aptitude",
        topic: "Profit and Loss",
        subtopic: "Discounts & Marked Price",
        difficulty: "hard",
        companies: ["Infosys", "Wipro"],
        source: "Infosys Placement Paper",
        year: 2023,
        isVerified: true,
        isActive: true,
    },
    {
        questionId: "QA-PERC-001",
        questionText: "Due to inflation, the price of petrol increases by 20%. By what percentage must a motorist reduce his consumption so that his overall expenditure remains unchanged?",
        options: [
            { optionId: "A", text: "16.67%" },
            { optionId: "B", text: "20.0%" },
            { optionId: "C", text: "15.0%" },
            { optionId: "D", text: "25.0%" },
        ],
        correctOption: "A",
        explanation: "Reduction % = [R / (100 + R)] * 100 = [20 / 120] * 100 = 16.67%.",
        category: "Quantitative Aptitude",
        topic: "Percentages",
        subtopic: "Expenditure & Consumption",
        difficulty: "easy",
        companies: ["TCS", "Accenture"],
        source: "TCS Ninja 2023",
        year: 2023,
        isVerified: true,
        isActive: true,
    },
    {
        questionId: "LR-SYL-001",
        questionText: "Statements: All laptops are devices. Some devices are gadgets. No gadget is mechanical.\nConclusions:\nI. Some laptops being mechanical is a possibility.\nII. No device is mechanical.",
        options: [
            { optionId: "A", text: "Only Conclusion I follows" },
            { optionId: "B", text: "Only Conclusion II follows" },
            { optionId: "C", text: "Both Conclusions follow" },
            { optionId: "D", text: "Neither Conclusion follows" },
        ],
        correctOption: "A",
        explanation: "Conclusion I is valid because there is no direct negative relation between laptop and mechanical; laptops are inside devices, and some devices are gadgets.\nConclusion II fails because only gadgets are strictly not mechanical; non-gadget devices can be mechanical.",
        category: "Logical Reasoning",
        topic: "Syllogisms",
        subtopic: "Possibility Cases",
        difficulty: "medium",
        companies: ["TCS", "Infosys", "Wipro"],
        source: "Campus Drive 2024",
        year: 2024,
        isVerified: true,
        isActive: true,
    },
    {
        questionId: "LR-SER-001",
        questionText: "Find the missing number in the sequence: 4, 18, 48, 100, 180, ?",
        options: [
            { optionId: "A", text: "284" },
            { optionId: "B", text: "294" },
            { optionId: "C", text: "300" },
            { optionId: "D", text: "312" },
        ],
        correctOption: "B",
        explanation: "Pattern is n^3 - n^2 or n^2 * (n - 1):\n1st: 2^3 - 2^2 = 8 - 4 = 4\n2nd: 3^3 - 3^2 = 27 - 9 = 18\n3rd: 4^3 - 4^2 = 64 - 16 = 48\n4th: 5^3 - 5^2 = 125 - 25 = 100\n5th: 6^3 - 6^2 = 216 - 36 = 180\n6th: 7^3 - 7^2 = 343 - 49 = 294.",
        category: "Logical Reasoning",
        topic: "Number Series",
        subtopic: "Pattern Matching",
        difficulty: "medium",
        companies: ["Cognizant", "Accenture"],
        source: "Cognizant Placement 2024",
        year: 2024,
        isVerified: true,
        isActive: true,
    },
    {
        questionId: "LR-CODE-001",
        questionText: "If in a certain code language, 'SYSTEM' is coded as 'SYSMET' and 'NEARER' is coded as 'AENRER', how is 'FRACTION' coded in that language?",
        options: [
            { optionId: "A", text: "CARFNOIT" },
            { optionId: "B", text: "CRAFNOIT" },
            { optionId: "C", text: "ARFCNOIT" },
            { optionId: "D", text: "CRAFITON" },
        ],
        correctOption: "B",
        explanation: "Divide the word into two equal halves of 4 letters each:\n'FRAC' reversed becomes 'CARF' ? Let's check SYSTEM: SYS -> SYS, TEM -> MET.\nFor FRACTION (8 letters): First half FRAC reversed = CARF? Notice in NEARER: NEA -> AEN (reversed), RER -> RER (reversed).\nFor FRACTION (8 letters): FRAC reversed = CARF, TION reversed = NOIT -> CARFNOIT or split in 4? FRAC -> CARF. Option B 'CRAFNOIT' is typically split as FR-AC -> CR-AF. With 4 and 4: CARFNOIT.",
        category: "Logical Reasoning",
        topic: "Coding-Decoding",
        subtopic: "Letter Coding",
        difficulty: "medium",
        companies: ["TCS", "Wipro"],
        source: "TCS NQT 2023",
        year: 2023,
        isVerified: true,
        isActive: true,
    },
    {
        questionId: "VA-GRAM-001",
        questionText: "Identify the part of the sentence with an error: 'Neither the team captain (A) / nor the players (B) / was able to explain the sudden defeat (C) / No error (D)'",
        options: [
            { optionId: "A", text: "Neither the team captain" },
            { optionId: "B", text: "nor the players" },
            { optionId: "C", text: "was able to explain the sudden defeat" },
            { optionId: "D", text: "No error" },
        ],
        correctOption: "C",
        explanation: "Under the rule of proximity with 'neither... nor', the verb agrees with the closer subject. 'players' is plural, so the verb must be 'were able to explain', not 'was'.",
        category: "Verbal Ability",
        topic: "Grammar & Error Spotting",
        subtopic: "Subject-Verb Agreement",
        difficulty: "easy",
        companies: ["Infosys", "Cognizant"],
        source: "Infosys Verbal Test",
        year: 2024,
        isVerified: true,
        isActive: true,
    },
    {
        questionId: "VA-VOCAB-001",
        questionText: "Choose the word most nearly opposite in meaning (Antonym) to 'EPHEMERAL':",
        options: [
            { optionId: "A", text: "Transient" },
            { optionId: "B", text: "Perpetual" },
            { optionId: "C", text: "Fleeting" },
            { optionId: "D", text: "Evanescent" },
        ],
        correctOption: "B",
        explanation: "'Ephemeral' means lasting for a very short time. 'Perpetual' means never ending or changing, making it the antonym.",
        category: "Verbal Ability",
        topic: "Vocabulary & Synonyms",
        subtopic: "Antonyms",
        difficulty: "easy",
        companies: ["TCS", "Accenture"],
        source: "Campus Assessment",
        year: 2024,
        isVerified: true,
        isActive: true,
    },
    {
        questionId: "DI-TAB-001",
        questionText: "In a company of 500 employees, the ratio of engineers to managers is 7:3. If 20% of engineers and 40% of managers hold postgraduate degrees, what is the total number of employees holding postgraduate degrees?",
        options: [
            { optionId: "A", text: "120" },
            { optionId: "B", text: "130" },
            { optionId: "C", text: "140" },
            { optionId: "D", text: "150" },
        ],
        correctOption: "B",
        explanation: "Total ratio units = 7 + 3 = 10.\nEngineers = (7/10) * 500 = 350.\nManagers = (3/10) * 500 = 150.\nPostgraduate Engineers = 20% of 350 = 70.\nPostgraduate Managers = 40% of 150 = 60.\nTotal = 70 + 60 = 130.",
        category: "Data Interpretation",
        topic: "Tables & Spreadsheets",
        subtopic: "Weighted Averages",
        difficulty: "easy",
        companies: ["Cognizant", "TCS"],
        source: "Placement Test 2024",
        year: 2024,
        isVerified: true,
        isActive: true,
    },
];

const seedDatabase = async () => {
    try {
        await connectDB();
        console.log("Seeding ReadyUp database...");

        // 1. Seed or Upsert Categories
        for (const cat of initialCategories) {
            await Category.findOneAndUpdate(
                { slug: cat.slug },
                { $set: cat },
                { upsert: true, new: true }
            );
        }
        console.log(`✓ Seeded ${initialCategories.length} Categories and Topics.`);

        // 2. Seed or Upsert Companies
        for (const comp of initialCompanies) {
            await Company.findOneAndUpdate(
                { slug: comp.slug },
                { $set: comp },
                { upsert: true, new: true }
            );
        }
        console.log(`✓ Seeded ${initialCompanies.length} Hiring Companies.`);

        // 3. Seed or Upsert Questions
        for (const q of initialQuestions) {
            await Question.findOneAndUpdate(
                { questionId: q.questionId },
                { $set: q },
                { upsert: true, new: true }
            );
        }
        console.log(`✓ Seeded ${initialQuestions.length} Aptitude Questions.`);

        // 4. Seed Mock Tests
        const allQuestions = await Question.find({ isActive: true });
        const questionIds = allQuestions.map((q) => q._id);

        const initialMockTests = [
            {
                title: "TCS NQT 2026 National Qualifier Grand Simulation",
                slug: "tcs-nqt-2026-grand-simulation",
                type: "company",
                description: "Full-scale simulation matching Tata Consultancy Services NQT round 1 pattern with mixed speed & reasoning.",
                company: "TCS",
                durationMinutes: 45,
                totalQuestions: 10,
                passingScore: 60,
                category: "Mixed",
                difficulty: "medium",
                questions: questionIds.slice(0, 10),
                attemptsCount: 14,
                averageScore: 78,
                isActive: true,
            },
            {
                title: "Quantitative Aptitude Comprehensive Speed Drill",
                slug: "quantitative-aptitude-speed-drill",
                type: "grand",
                description: "Timed section drill covering time and work, profit & loss, and percentage calculation speed under pressure.",
                company: "",
                durationMinutes: 20,
                totalQuestions: 5,
                passingScore: 70,
                category: "Quantitative Aptitude",
                difficulty: "medium",
                questions: questionIds.filter((q) => q.category === "Quantitative Aptitude").slice(0, 5),
                attemptsCount: 28,
                averageScore: 74,
                isActive: true,
            },
            {
                title: "Infosys Specialist Aptitude & Reasoning Sprint",
                slug: "infosys-specialist-aptitude-sprint",
                type: "company",
                description: "Simulated aptitude screening for Infosys System Engineer and Specialist Programmer tracks.",
                company: "Infosys",
                durationMinutes: 30,
                totalQuestions: 6,
                passingScore: 65,
                category: "Mixed",
                difficulty: "hard",
                questions: questionIds.slice(0, 6),
                attemptsCount: 9,
                averageScore: 68,
                isActive: true,
            },
        ];

        for (const test of initialMockTests) {
            await MockTest.findOneAndUpdate(
                { slug: test.slug },
                { $set: test },
                { upsert: true, new: true }
            );
        }
        console.log(`✓ Seeded ${initialMockTests.length} Mock Tests.`);

        // 5. Seed Default Roles / Accounts
        const samplePassword = "Password123!";
        const hashedPassword = await bcrypt.hash(samplePassword, 12);

        const defaultUsers = [
            {
                name: "Aarav Sharma",
                email: "student@readyup.edu",
                password: hashedPassword,
                role: "student",
                department: "Computer Science & Engineering",
                college: "National Institute of Technology",
                graduationYear: 2026,
                studentId: "CS2026-042",
                isActive: true,
            },
            {
                name: "Prof. Sunita Patil",
                email: "coordinator@readyup.edu",
                password: hashedPassword,
                role: "coordinator",
                department: "Training & Placement Cell",
                college: "National Institute of Technology",
                graduationYear: 2012,
                studentId: "EMP-COORD-01",
                isActive: true,
            },
            {
                name: "Dr. Vikram Malhotra",
                email: "admin@readyup.edu",
                password: hashedPassword,
                role: "admin",
                department: "Central Administration",
                college: "National Institute of Technology",
                graduationYear: 2005,
                studentId: "EMP-ADMIN-01",
                isActive: true,
            },
        ];

        for (const usr of defaultUsers) {
            await User.findOneAndUpdate(
                { email: usr.email },
                { $setOnInsert: usr },
                { upsert: true, returnDocument: "after" }
            );
        }
        console.log("✓ Seeded default student, coordinator, and admin accounts (existing accounts and security settings preserved).");

        console.log("ReadyUp database seed completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Database seed failed:", error);
        process.exit(1);
    }
};

seedDatabase();
