/**
 * Long-form page copy managed from Admin → Site Content → Page Sections.
 *
 * Each key is saved through PUT /admin/content and read back from GET /content like every other
 * site content field. The values below are only the starting copy, used until an admin saves
 * their own; pages never hardcode this text themselves.
 *
 * Generated from the original page copy; edit freely.
 */

export const PAGE_SECTION_KEYS = [
  "homeWhyChooseJson",
  "aboutValuesJson",
  "aboutTeamJson",
  "publishServicesJson",
  "publishStepsJson",
  "guidelinesSectionsJson",
  "guidelinesStepsJson",
  "royaltyScheduleJson",
  "royaltyExamplesJson",
  "royaltyFaqsJson",
  "returnsStepsJson",
  "returnsEligibleJson",
  "returnsNotEligibleJson",
  "returnsFaqsJson",
  "privacySectionsJson",
  "termsSectionsJson",
  "careersBenefitsJson",
] as const;

export type PageSectionKey = (typeof PAGE_SECTION_KEYS)[number];

/** Admin editor labels: which page a section belongs to and the JSON shape it expects. */
export const PAGE_SECTION_FIELDS: { key: PageSectionKey; page: string; label: string; shape: string }[] = [
  {
    key: "homeWhyChooseJson",
    page: "Home",
    label: "Why choose us cards",
    shape: '[{ "title", "description", "highlight" }]',
  },
  { key: "aboutValuesJson", page: "About", label: "Our values", shape: '[{ "title", "description" }]' },
  { key: "aboutTeamJson", page: "About", label: "Team members", shape: '[{ "name", "role", "image", "bio" }]' },
  {
    key: "publishServicesJson",
    page: "Publish",
    label: "Publishing services",
    shape: '[{ "title", "description", "features": [] }]',
  },
  { key: "publishStepsJson", page: "Publish", label: "How it works steps", shape: '[{ "title", "description" }]' },
  {
    key: "guidelinesSectionsJson",
    page: "Author Guidelines",
    label: "Guideline lists",
    shape: '[{ "title", "items": [] }]',
  },
  {
    key: "guidelinesStepsJson",
    page: "Author Guidelines",
    label: "Submission steps",
    shape: '[{ "title", "description" }]',
  },
  { key: "royaltyScheduleJson", page: "Royalty Info", label: "Payment process", shape: '[{ "title", "description" }]' },
  {
    key: "royaltyExamplesJson",
    page: "Royalty Info",
    label: "Earning examples",
    shape: '[{ "scenario", "retail", "charges", "royalty", "note" }]',
  },
  { key: "royaltyFaqsJson", page: "Royalty Info", label: "Royalty FAQs", shape: '[{ "question", "answer" }]' },
  { key: "returnsStepsJson", page: "Returns", label: "Return process steps", shape: '[{ "title", "description" }]' },
  { key: "returnsEligibleJson", page: "Returns", label: "Eligible reasons", shape: '["reason", ...]' },
  { key: "returnsNotEligibleJson", page: "Returns", label: "Not eligible reasons", shape: '["reason", ...]' },
  { key: "returnsFaqsJson", page: "Returns", label: "Returns FAQs", shape: '[{ "question", "answer" }]' },
  { key: "privacySectionsJson", page: "Privacy Policy", label: "Policy sections", shape: '[{ "title", "content" }]' },
  { key: "termsSectionsJson", page: "Terms", label: "Terms sections", shape: '[{ "title", "content" }]' },
  {
    key: "careersBenefitsJson",
    page: "Careers",
    label: "Benefits (leave [] to hide)",
    shape: '[{ "title", "description" }]',
  },
];

export const pageSectionDefaults: Record<PageSectionKey, string> = {
  homeWhyChooseJson: JSON.stringify(
    [
      {
        title: "100% Author Rights & Freedom",
        description: "You retain total copyright ownership and creative control over your manuscript and book covers.",
        highlight: "Author Centric",
      },
      {
        title: "Premium Print & Hardcover Quality",
        description: "Acid-free archival paper, rich color saturation, and durable matte/gloss hardcover bindings.",
        highlight: "Luxury Finish",
      },
      {
        title: "Pan-India Express Distribution",
        description: "Direct listing across online stores, local bookstore partnerships, and fast door-step delivery.",
        highlight: "Fast Delivery",
      },
      {
        title: "Transparent Royalties",
        description:
          "Live dashboard of copies sold per book. Your royalty is the MRP minus printing, platform and delivery charges.",
        highlight: "Clear Earnings",
      },
    ],
    null,
    2,
  ),
  aboutValuesJson: JSON.stringify(
    [
      {
        title: "Quality Editorial First",
        description:
          "We maintain strict editorial standards in editing, typography, cover design, and archival printing so every book stands out.",
      },
      {
        title: "Author-Centric Values",
        description:
          "Our authors retain 100% copyright ownership, with clear royalty statements and dedicated editorial guidance.",
      },
      {
        title: "Modern Print Innovation",
        description:
          "We leverage print-on-demand technology and digital e-book distribution to reach global reader communities seamlessly.",
      },
    ],
    null,
    2,
  ),
  aboutTeamJson: JSON.stringify(
    [
      {
        name: "Sunkarapally Sai Teja",
        role: "Founder & CEO",
        image: "/founder.webp",
        bio: "Championing independent authors and building India's premier literary publishing house.",
      },
    ],
    null,
    2,
  ),
  publishServicesJson: JSON.stringify(
    [
      {
        title: "Professional Editorial",
        description:
          "Expert developmental editors, copyeditors, and proofreaders refine your narrative for global publication standards.",
        features: ["Developmental review", "Line editing", "Proofreading", "Style consistency"],
      },
      {
        title: "Bespoke Cover Design",
        description: "Eye-catching, original cover artwork designed by luxury publishing graphic artists.",
        features: [
          "Original illustration",
          "Typography hierarchy",
          "Hardcover & paperback formats",
          "3D digital mockups",
        ],
      },
      {
        title: "Interior Typesetting",
        description:
          "Elegant page layout and interior typography crafted for effortless reading across print and e-readers.",
        features: ["Custom font sizing", "EPUB & Kindle formats", "Print-ready PDFs", "Chapter flourishes"],
      },
      {
        title: "Marketing & Launch Campaign",
        description: "Multi-channel marketing strategy to launch your book into bestseller lists.",
        features: ["Social media campaign", "Press release distribution", "Author brand kit", "Bookstore pitching"],
      },
      {
        title: "Nationwide & Global Distribution",
        description: "Direct listing across Amazon, Flipkart, online marketplaces, and brick-and-mortar bookstores.",
        features: [
          "Amazon Kindle & Prime",
          "Flipkart listing",
          "International distribution",
          "Direct order fulfillment",
        ],
      },
      {
        title: "Transparent Royalties",
        description:
          "Your royalty is the MRP minus printing, platform and delivery charges, tracked live in your author dashboard.",
        features: [
          "MRP − charges = your royalty",
          "Bank transfer or UPI payouts",
          "Live sales dashboard",
          "Only three listed charges",
        ],
      },
    ],
    null,
    2,
  ),
  publishStepsJson: JSON.stringify(
    [
      {
        title: "Submit Manuscript",
        description: "Upload your draft manuscript through our secure author portal in minutes.",
      },
      {
        title: "Editorial Evaluation",
        description: "Senior editors review your submission and provide detailed feedback within 7 days.",
      },
      {
        title: "Editing & Design",
        description: "Collaborate closely with dedicated editors and cover designers to perfect your book.",
      },
      {
        title: "Publish & Launch",
        description:
          "Your book goes live in our store and partner channels, with every sale and royalty shown in your dashboard.",
      },
    ],
    null,
    2,
  ),
  guidelinesSectionsJson: JSON.stringify(
    [
      {
        title: "Manuscript Requirements",
        items: [
          "Minimum 30,000 words for novels",
          "Minimum 20,000 words for non-fiction",
          "Microsoft Word (.doc, .docx) or PDF format",
          "Double-spaced, 12pt font (Times New Roman or Arial)",
          "Standard margins (1 inch on all sides)",
          "Single paragraph indentation, not tab indentation",
        ],
      },
      {
        title: "Content Guidelines",
        items: [
          "Original, unpublished work only",
          "No plagiarism or copyright infringement",
          "Appropriate for the target audience",
          "Professional quality writing",
          "Clear narrative structure and flow",
          "Proper grammar and spelling throughout",
        ],
      },
      {
        title: "Writing Standards",
        items: [
          "Consistent voice and tone",
          "Well-developed characters and plot",
          "Engaging opening and compelling ending",
          "Proper chapter breaks and organization",
          "Minimal plot holes or inconsistencies",
          "Age-appropriate content for target market",
        ],
      },
    ],
    null,
    2,
  ),
  guidelinesStepsJson: JSON.stringify(
    [
      {
        title: "Create Account",
        description: "Register on Harglim Publishers and set up your author profile",
      },
      {
        title: "Submit Manuscript",
        description: "Upload your manuscript through the author dashboard",
      },
      {
        title: "Initial Review",
        description: "Our team reviews your work (7-14 days)",
      },
      {
        title: "Editor Feedback",
        description: "Receive detailed feedback and revision suggestions",
      },
      {
        title: "Revisions",
        description: "Make necessary revisions and resubmit",
      },
      {
        title: "Publication",
        description: "Final approval and launch on our platform",
      },
    ],
    null,
    2,
  ),
  royaltyScheduleJson: JSON.stringify(
    [
      {
        title: "Live Sales Tracking",
        description: "Every copy sold and its royalty shows in your author dashboard.",
      },
      {
        title: "Publisher Settlements",
        description: "The publisher groups your earned royalties into a settlement and approves it.",
      },
      {
        title: "Bank or UPI Payout",
        description:
          "Approved settlements are paid by bank transfer, UPI or cheque, with the payment reference shown to you.",
      },
    ],
    null,
    2,
  ),
  royaltyExamplesJson: JSON.stringify(
    [
      {
        scenario: "Paperback Sale",
        retail: "₹399",
        charges: "₹239",
        royalty: "₹160",
        note: "10 sales/month = ₹1,600",
      },
      {
        scenario: "E-Book Sale",
        retail: "₹199",
        charges: "₹99",
        royalty: "₹100",
        note: "20 sales/month = ₹2,000",
      },
      {
        scenario: "Hardcover Sale",
        retail: "₹599",
        charges: "₹329",
        royalty: "₹270",
        note: "5 sales/month = ₹1,350",
      },
    ],
    null,
    2,
  ),
  royaltyFaqsJson: JSON.stringify(
    [
      {
        question: "When do I receive my royalties?",
        answer:
          "The publisher reviews your earned royalties and pays them as settlements by bank transfer, UPI or cheque. Each payout, with its reference, appears under Payout Settlements in your dashboard.",
      },
      {
        question: "How are sales tracked?",
        answer:
          "Sales are tracked in real-time through our digital platform. You can view detailed sales reports, breakdowns by region, and revenue trends in your author dashboard.",
      },
      {
        question: "Can my royalty per copy increase?",
        answer:
          "Yes. A higher MRP or lower printing and delivery costs leave more for you. Contact our partnership team to review your book's pricing.",
      },
      {
        question: "What about international sales?",
        answer:
          "International sales are tracked separately and paid on the same basis: MRP minus printing, platform and delivery charges. We handle currency conversion and pay in INR or USD based on your preference.",
      },
      {
        question: "Are there any deductions from royalties?",
        answer:
          "Only three: printing cost, platform charges and delivery charges are subtracted from the MRP. Everything left is your royalty.",
      },
      {
        question: "How do I track my sales?",
        answer:
          "Log into your author dashboard anytime to view real-time sales data, earnings, and detailed analytics for each of your books.",
      },
    ],
    null,
    2,
  ),
  returnsStepsJson: JSON.stringify(
    [
      {
        title: "Initiate Return",
        description: "Contact our support team within 30 days of receipt with your order number and reason for return.",
      },
      {
        title: "Approval",
        description: "We review your return request and provide you with a prepaid return shipping label.",
      },
      {
        title: "Ship Back",
        description: "Pack the book securely and ship it back using the provided label within 10 days.",
      },
      {
        title: "Receive & Refund",
        description: "Once we receive and inspect the book, we process your refund within 5-7 business days.",
      },
    ],
    null,
    2,
  ),
  returnsEligibleJson: JSON.stringify(
    [
      "Damaged or defective book",
      "Book arrived in incorrect condition",
      "Wrong book was sent",
      "Book not as described in the listing",
      "Printing quality issues",
    ],
    null,
    2,
  ),
  returnsNotEligibleJson: JSON.stringify(
    [
      "Change of mind (without defect)",
      "Book shows signs of excessive reading or wear",
      "Missing original packaging",
      "Book has personal annotations",
      "Damage caused after receipt",
      "Item purchased more than 30 days ago",
    ],
    null,
    2,
  ),
  returnsFaqsJson: JSON.stringify(
    [
      {
        question: "What is the return window?",
        answer:
          "You have 30 days from the date of delivery to initiate a return. Return requests made after 30 days will not be accepted.",
      },
      {
        question: "How do I know if my book is eligible for return?",
        answer:
          "Your book is eligible if it's defective, damaged, incorrect, or not as described. Books with signs of normal wear, personal use, or modifications are not eligible.",
      },
      {
        question: "Do I need to pay for return shipping?",
        answer:
          "For eligible returns, we provide a prepaid return shipping label. You won't need to pay for return shipping.",
      },
      {
        question: "Will I get a full refund?",
        answer:
          "Yes, for approved returns, you'll receive a full refund of the purchase price. This includes the original shipping cost.",
      },
      {
        question: "How long does the refund process take?",
        answer:
          "Once we receive your returned book and verify its condition, we process the refund within 5-7 business days.",
      },
      {
        question: "Can I exchange a book instead of returning it?",
        answer: "For defective books, we can arrange an exchange. Contact support to discuss exchange options.",
      },
      {
        question: "What if my package is lost in transit?",
        answer:
          "Use the tracking number provided to file a claim with the carrier. Contact our support team for assistance.",
      },
      {
        question: "Can I return e-books or digital products?",
        answer:
          "Digital products cannot be returned once downloaded. Physical books can be returned according to this policy.",
      },
    ],
    null,
    2,
  ),
  privacySectionsJson: JSON.stringify(
    [
      {
        title: "1. Introduction",
        content:
          'Harglim Publishers ("Company", "we", "our", or "us") operates the Harglim Publishers website and mobile application (the "Service"). This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service and the choices you have associated with that data. Our Privacy Policy applies to all visitors, users, and others who access the Service. If you do not agree with our policies and practices, please do not use our Service.',
      },
      {
        title: "2. Information Collection and Use",
        content:
          "We collect several different types of information for various purposes to provide and improve our Service to you.\n\nTypes of Data Collected:\n• Personal Data: Name, email address, phone number, postal address, payment information, and cookies or similar tracking technologies\n• Book Purchase Information: Books purchased, reading preferences, and order history\n• Author Information: Manuscript details, publishing information, and royalty data\n• Device Information: Browser type, IP address, and operating system\n\nReasons for Collection:\n• To provide and maintain our Service\n• To process transactions and send related information\n• To provide customer support\n• To monitor usage patterns and improve our Service\n• To detect and prevent fraudulent transactions\n• To send promotional emails and newsletters (with consent)",
      },
      {
        title: "3. Use of Data",
        content:
          "Harglim Publishers uses the collected data for various purposes:\n\n• Providing and maintaining our Service\n• Notifying you about changes to our Service\n• Providing customer care and support\n• Gathering analysis or valuable information to improve our Service\n• Monitoring the usage of our Service\n• Detecting, preventing and addressing technical issues and fraud\n• With your consent, to provide you with news, special offers and general information\n\nWe will not sell, trade, or rent your personal information to third parties without your explicit consent, except as required by law or in cases of emergency.",
      },
      {
        title: "4. Security of Data",
        content:
          "The security of your data is important to us but remember that no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your personal data, we cannot guarantee its absolute security.\n\nSecurity Measures:\n• SSL/TLS encryption for data in transit\n• Secure password hashing and storage\n• Regular security audits and updates\n• Limited access to personal data\n• Compliance with industry standards\n• Incident response procedures",
      },
      {
        title: "5. Communication Preferences",
        content:
          'We will send you promotional emails and newsletters with your consent. You can opt out of receiving promotional emails by clicking the "unsubscribe" link in our emails or by logging into your account and adjusting your preferences.\n\nHowever, we will continue to send you transactional and service-related emails (such as order confirmations, shipping updates, and account notifications) even if you opt out of promotional emails.',
      },
      {
        title: "6. User Rights",
        content:
          "You have the following rights regarding your personal data:\n\n• Right to Access: You can request a copy of your personal data\n• Right to Correction: You can request correction of inaccurate data\n• Right to Deletion: You can request deletion of your data (right to be forgotten)\n• Right to Data Portability: You can request your data in a portable format\n• Right to Withdraw Consent: You can withdraw previously given consent\n• Right to Lodge Complaint: You can file a complaint with data protection authorities\n\nTo exercise these rights, please contact us at privacy@harglim.com with your request.",
      },
      {
        title: "7. Third-Party Links",
        content:
          "Our Service may contain links to third-party websites, applications, and services that are not operated by us. This Privacy Policy does not apply to third-party services, and we are not responsible for their privacy practices. We encourage you to review the privacy policies of any third-party services before providing your personal information.",
      },
      {
        title: "8. Children's Privacy",
        content:
          "Our Service is not intended for use by children under the age of 13. We do not knowingly collect personal information from children under 13. If we discover that a child under 13 has provided us with personal data, we will delete such information immediately.\n\nIf you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately at privacy@harglim.com.",
      },
      {
        title: "9. Changes to This Privacy Policy",
        content:
          'We may update our Privacy Policy from time to time to reflect changes in our practices or other operational, legal, or regulatory reasons. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.\n\nYour continued use of the Service after such modifications constitutes your acknowledgment and acceptance of the updated Privacy Policy.',
      },
      {
        title: "10. Contact Us",
        content:
          "If you have any questions about this Privacy Policy or our privacy practices, please contact us at:\n\nHarglim Publishers\nEmail: privacy@harglim.com\nAddress: 123 Publishing Lane, Mumbai, India 400001\nPhone: +91 98765 43210\n\nWe will respond to your inquiry within 7 business days.",
      },
    ],
    null,
    2,
  ),
  termsSectionsJson: JSON.stringify(
    [
      {
        title: "1. Agreement to Terms",
        content:
          'By accessing or using the Harglim Publishers website and mobile application (the "Service"), you agree to be bound by these Terms of Service. If you disagree with any part of the terms, then you do not have permission to access the Service.\n      \nThese Terms apply to all visitors, users, authors, and others who access or use the Service.',
      },
      {
        title: "2. User Accounts",
        content:
          "When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.\n\nYou are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password, whether your password is with our Service or a third-party service.\n\nYou agree not to disclose your password to any third party. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.",
      },
      {
        title: "3. E-commerce and Purchases",
        content:
          'If you wish to purchase any product or service made available through the Service ("Purchase"), you may be asked to supply certain information relevant to your Purchase including, without limitation, your credit card number, the expiration date of your credit card, your billing address, and your shipping information.\n\nYou represent and warrant that: (i) you have the legal right to use any credit card(s) or other payment method(s) in connection with any Purchase; and that (ii) the information you supply to us is true, correct and complete.\n\nWe reserve the right to refuse or cancel your order at any time for certain reasons including but not limited to: product or service availability, errors in the description or price of the product or service, error in your order or other reasons.',
      },
      {
        title: "4. Author Publishing",
        content:
          "Authors who submit manuscripts or publish through Harglim Publishers retain the copyright to their original works. By publishing with us, you grant Harglim Publishers a non-exclusive, worldwide, royalty-bearing license to reproduce, distribute, display, and sell your book through our platform and partner networks.\n\nAuthors are responsible for ensuring that their content does not infringe upon the intellectual property rights of others and does not contain libelous, defamatory, or otherwise unlawful material.\n\nRoyalties and payment terms for authors are governed by the specific Publishing Agreement provided during the manuscript acceptance process.",
      },
      {
        title: "5. Intellectual Property",
        content:
          "The Service and its original content (excluding Content provided by users and authors), features, and functionality are and will remain the exclusive property of Harglim Publishers and its licensors. The Service is protected by copyright, trademark, and other laws of both India and foreign countries.\n\nOur trademarks and trade dress may not be used in connection with any product or service without the prior written consent of Harglim Publishers.",
      },
      {
        title: "6. Limitation of Liability",
        content:
          "In no event shall Harglim Publishers, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from:\n\n(i) your access to or use of or inability to access or use the Service;\n(ii) any conduct or content of any third party on the Service;\n(iii) any content obtained from the Service; and\n(iv) unauthorized access, use or alteration of your transmissions or content.",
      },
      {
        title: "7. Changes to Terms",
        content:
          "We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.\n\nBy continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms. If you do not agree to the new terms, please stop using the Service.",
      },
    ],
    null,
    2,
  ),
  careersBenefitsJson: JSON.stringify([], null, 2),
};

/** Default for faqsJson: categorised FAQs shared by the FAQ page and the home page. */
export const defaultFaqsJson = JSON.stringify(
  [
    {
      category: "General Questions",
      items: [
        {
          question: "What is Harglim Publishers?",
          answer:
            "Harglim Publishers is a modern, author-friendly publishing platform that empowers writers to publish and distribute their books globally while maintaining creative control and earning competitive royalties.",
        },
        {
          question: "Do I need an agent to publish with Harglim?",
          answer:
            "No, we work directly with authors. You don't need a literary agent to publish with us. Simply create an account and submit your manuscript through our platform.",
        },
        {
          question: "What genres do you accept?",
          answer:
            "We accept all genres including fiction, non-fiction, romance, mystery, science fiction, fantasy, self-help, biography, and more. Our focus is on quality content in any category.",
        },
        {
          question: "Is there a publishing fee?",
          answer:
            "Publishing packages start at ₹999. Each package lists what it includes, such as ISBN, cover design, formatting, author copies and distribution.",
        },
        {
          question: "How much royalty do authors earn?",
          answer:
            "Your royalty on each copy is the MRP minus printing, platform and delivery charges. Every sale and its royalty is visible in your Author Dashboard.",
        },
        {
          question: "Do I retain full copyright ownership of my book?",
          answer:
            "Yes, 100%! You retain complete copyright ownership, translation rights, and adaptation rights to your work. Harglim Publishers acts strictly as your printing, distribution, and publishing partner.",
        },
      ],
    },
    {
      category: "Submission & Publishing",
      items: [
        {
          question: "How do I submit my manuscript?",
          answer:
            'Create an author account, go to your dashboard, and use the "Submit Manuscript" button. Upload your manuscript in Word or PDF format and fill out the submission form.',
        },
        {
          question: "How long does the review process take?",
          answer:
            "Our initial review takes 7-14 days. If selected for publication, the complete process from submission to launch typically takes 2-4 weeks depending on required revisions.",
        },
        {
          question: "What if my manuscript is rejected?",
          answer:
            "We provide constructive feedback on rejected manuscripts. Many authors revise and resubmit. We welcome second submissions after addressing our feedback.",
        },
        {
          question: "Do you accept translated works?",
          answer:
            "Yes, we accept quality translations. Please ensure the translation rights are secured and include documentation of rights with your submission.",
        },
      ],
    },
    {
      category: "Books & Distribution",
      items: [
        {
          question: "Where will my book be available?",
          answer:
            "Your book will be available on Harglim Publishers platform, major online retailers (Amazon, Goodreads), and can be ordered through independent bookstores worldwide.",
        },
        {
          question: "Can I print physical copies of my book?",
          answer:
            "Yes! We provide print-on-demand services. Physical copies can be printed in small batches or as orders come in, reducing printing costs.",
        },
        {
          question: "Can I publish in multiple formats?",
          answer:
            "We publish paperback and hardcover editions, and selected packages include an e-book. Ask our team about other formats.",
        },
        {
          question: "Can I change my book after publishing?",
          answer:
            "Yes, you can update your manuscript, cover design, or book details. Changes typically go live within 24-48 hours.",
        },
        {
          question: "How long does shipping take for ordered books?",
          answer:
            "Orders are processed and printed within 24 to 48 hours. Express shipping across India typically arrives within 3 to 5 business days with live SMS and email tracking.",
        },
      ],
    },
    {
      category: "Rights & Copyright",
      items: [
        {
          question: "Do I retain copyright of my book?",
          answer:
            "Yes, you retain full copyright. You grant us permission to publish and distribute, but you remain the sole copyright holder and owner of your work.",
        },
        {
          question: "Can I sell my book elsewhere?",
          answer: "Yes. We do not require exclusivity, so you can also publish your book on other platforms.",
        },
        {
          question: "What if I want to remove my book?",
          answer:
            "You can unpublish your book anytime from your author dashboard. Published copies remain active, but new orders won't be processed after unpublishing.",
        },
      ],
    },
  ],
  null,
  2,
);

/**
 * The saved list for `key`, or the default when the saved value is missing, not valid JSON,
 * or not a list. Pages map over the result.
 */
export function readSection<T = any>(content: Partial<Record<string, any>> | undefined, key: PageSectionKey): T[] {
  for (const raw of [content?.[key], pageSectionDefaults[key]]) {
    if (typeof raw !== "string" || !raw.trim()) continue;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as T[];
    } catch {
      // Fall through to the default.
    }
  }
  return [];
}

/** Flattens categorised FAQs ([{ category, items }]) or a plain list into question/answer pairs. */
export function flattenFaqs(raw: unknown): { question: string; answer: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .flatMap((item: any) => (Array.isArray(item?.items) ? item.items : [item]))
    .filter((f: any) => f?.question && f?.answer);
}
