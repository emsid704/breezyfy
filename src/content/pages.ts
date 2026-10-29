import { siteConfig } from "../config";

export type ContentPage = {
  title: string;
  kicker: string;
  intro: string;
  sections: { title: string; body: string[] }[];
};

export const legalLastUpdated = "29 October 2026";

/** Original copy for the current free, local-processing release. See docs/LAUNCH-CHECKLIST.md. */
export const legalPages: Record<string, ContentPage> = {
  terms: {
    title: "Terms of use",
    kicker: "The agreement",
    intro:
      "Breezyfy is a free browser tool for editing media you own or have permission to modify. These terms explain the service, your responsibilities and the limits of its results.",
    sections: [
      {
        title: "Using Breezyfy",
        body: [
          "These terms apply to the Breezyfy website at breezyfy.com. Please read them before using the tool. If you do not agree, do not use the service. If you act for an organisation, you must have authority to do so.",
          "You must have the legal capacity to use this service under the rules that apply where you live. If you need a parent or guardian’s permission, obtain it before using the tool.",
          "This release is free and does not offer accounts, subscriptions or paid credits. It runs media processing in your browser. Your internet connection, device and browser remain your responsibility.",
        ],
      },
      {
        title: "Your files and your rights",
        body: [
          "You keep the rights you already hold in your files. Selecting a file does not grant Breezyfy a licence to publish, sell or train a model on it. The tool does not upload your selected media for processing.",
          "Only process files you created, own, or are authorised to modify. Removing a visible mark does not create a copyright licence, cancel a contract, or change the rights of a creator, platform or other person.",
          "You remain responsible for the way you use and publish an output, including permissions, required attribution, privacy and publicity rights, and any applicable AI disclosure requirements. Our Acceptable Use page explains these responsibilities further.",
        ],
      },
      {
        title: "Results and limitations",
        body: [
          "Breezyfy works on supported visible overlay patterns. It is not a universal watermark remover. A successful export does not guarantee that every mark is gone or that every original pixel has been recovered.",
          "Resizing, compression, opaque overlays, unfamiliar patterns and browser codec support can affect results. Editing and re-encoding can change colour, quality, metadata or file size. Keep your original and review the output before relying on it.",
          "The tool does not target invisible provenance systems such as SynthID. This is not a guarantee that editing will preserve every embedded signal or metadata field. Do not use the service to mislead people about the source or nature of your content.",
        ],
      },
      {
        title: "Availability and responsible access",
        body: [
          "Features may change, be interrupted or be withdrawn. Processing depends on your device and available browser APIs. Breezyfy is not a backup service and cannot recover an output you have not downloaded.",
          "Do not attack the site, distribute malicious files, interfere with other visitors, impersonate someone else, or use the service for unlawful or abusive activity. We may take proportionate measures to protect the site and its users.",
        ],
      },
      {
        title: "Software and third-party names",
        body: [
          "Rights in Breezyfy’s branding, interface and original materials remain with their respective owners. Any separately licensed software remains subject to its own licence; these terms do not take away rights that licence gives you.",
          "Google, Gemini, Veo, Flow and other product names belong to their respective owners. Breezyfy is independent and is not affiliated with or endorsed by those companies. Their services and any external links have their own terms.",
        ],
      },
      {
        title: "Fair limits on responsibility",
        body: [
          "The service is provided as available. To the extent permitted by law, we do not promise uninterrupted operation, suitability for a particular purpose, or a particular editing result.",
          "To the extent permitted by law, Breezyfy is not responsible for losses that were not reasonably foreseeable or business losses such as lost profit arising from use of this free tool. You should keep originals and check exported files before important use.",
          "Nothing in these terms excludes or limits liability for fraud, deliberate misconduct, death or personal injury caused by negligence, or any other liability that cannot lawfully be limited. Your mandatory consumer rights and available legal remedies continue to apply.",
        ],
      },
      {
        title: "Changes, privacy and contact",
        body: [
          "The Privacy and Browser Storage pages describe how this release handles media, preferences and website requests. If the service changes, its notices should be updated to match. Updated terms apply prospectively from their stated date, subject to any notice or consent required by law.",
          `For support, questions about these terms, or reports of misuse, contact Breezyfy at ${siteConfig.supportEmail}. Please include a description of the issue; do not attach private media unless you choose to share it.`,
          "These terms do not select a country’s law or require arbitration. Any mandatory protections and rules that apply to you remain in force. If a provision is unenforceable, the remaining provisions continue only to the extent the law permits.",
        ],
      },
    ],
  },
  privacy: {
    title: "Privacy policy",
    kicker: "Your files stay with you",
    intro:
      "Selected images and videos are processed on your device. This page separates that local editing from the ordinary information needed to deliver a website.",
    sections: [
      {
        title: "Media you select",
        body: [
          "Breezyfy reads files you deliberately select, drop or paste into the workspace. The application processes their contents in browser memory and does not send the media, thumbnails or filenames to a processing server.",
          "The working queue and results are temporary. Clearing a file or reloading the page removes it from the active workspace. Breezyfy does not save a media library or processing history to persistent browser storage.",
          "Files you download are saved by your browser to the location you choose. Clearing the workspace does not delete those downloads or your original files. Your browser or operating system may manage caches, memory and backups independently of the app.",
        ],
      },
      {
        title: "Preferences on your device",
        body: [
          "The application uses local browser storage to remember interface theme and processing preferences. It does not put your selected images, videos or filenames into that preference storage.",
          "These settings can remain after you close the tab. You can remove them through your browser’s site-data controls. Blocking storage may prevent preferences from being remembered, but it does not authorise a media upload.",
        ],
      },
      {
        title: "Website delivery and hosting",
        body: [
          "Loading the website sends normal web requests to our hosting provider, Vercel. Those requests can include your IP address, browser information, requested URL and time. The provider may process operational and security logs to deliver and protect the service.",
          "Local media processing does not mean that a website visit is anonymous. The deployed hosting configuration and Vercel’s applicable policies determine hosting-log access, retention and processing locations. We do not promise a fixed log-deletion period that has not been verified.",
          "The application does not include advertising, analytics trackers, login or payment collection in this release. It does not sell the media you select or send it to an AI service.",
        ],
      },
      {
        title: "Your choices and privacy requests",
        body: [
          "You control which files enter the workspace. Keep sensitive content off a shared or untrusted device, and remove it from the workspace when you finish. Closing the tool does not remove a downloaded file from your device.",
          "Depending on the law that applies, you may have rights to access, correct or delete personal information, object to or restrict processing, or complain to a relevant privacy authority. We cannot supply or delete copies of media that the application has never received.",
          `Send privacy questions or rights requests to Breezyfy at ${siteConfig.supportEmail}. If you email us, we receive your email address and whatever you choose to include so that we can respond. Google provides the email service; avoid sending sensitive media. We keep correspondence only as reasonably needed to handle the request and meet applicable obligations.`,
        ],
      },
      {
        title: "Security, links and policy changes",
        body: [
          "Local processing reduces the need to transfer files, but no website or device can promise perfect security. Browser extensions, device software and external sites operate under their own controls and policies.",
          "Opening an external link sends a request to that site. Breezyfy’s policy does not control how the external site handles it.",
          "If future releases add accounts, storage, analytics or another data use, this policy must be reviewed and updated before those features are enabled. Any legally required notice or choice must be provided at that time.",
        ],
      },
    ],
  },
  "acceptable-use": {
    title: "Acceptable use",
    kicker: "Create with permission",
    intro:
      "Breezyfy is for legitimate editing of your own or authorised media. A processing tool cannot give you rights in someone else’s work.",
    sections: [
      {
        title: "Start with permission",
        body: [
          "Use the tool on content you created, own, or have clear permission to modify. Confirm any licence or platform conditions that apply to the file and your intended use.",
          "Permission to view or download a file does not necessarily include permission to alter it, remove a mark, or publish it commercially.",
        ],
      },
      {
        title: "Respect attribution and people",
        body: [
          "Do not remove someone else’s copyright notice, signature, ownership mark or required attribution to disguise where their work came from or to avoid a licence fee.",
          "Do not use the service for fraud, unlawful impersonation, harassment, non-consensual intimate content, exploitation, or infringement of another person’s privacy or intellectual-property rights.",
        ],
      },
      {
        title: "Be honest about AI-generated content",
        body: [
          "Follow the disclosure rules of the platform, contract and law that apply when you publish. Removing a visible overlay does not make an AI-generated file human-created or change its origin.",
          "Breezyfy does not target invisible provenance signals. Do not rely on an export to prove that provenance was either preserved or removed: image conversion and video encoding may change metadata and other file properties.",
        ],
      },
      {
        title: "Keep the service usable",
        body: [
          "Do not attempt to compromise the website or another visitor’s device, distribute malware, evade access controls, or generate traffic intended to disrupt service.",
          "Review each output and keep your original. You are responsible for deciding whether an edited file is suitable for its intended purpose.",
        ],
      },
    ],
  },
  cookies: {
    title: "Browser storage",
    kicker: "Simple preferences",
    intro:
      "This release uses local storage for your settings and theme. It does not add advertising or analytics cookies.",
    sections: [
      {
        title: "What the app remembers",
        body: [
          "Breezyfy stores interface and processing preferences in localStorage on your device so you can reuse them on a later visit. Local storage is separate from a cookie and is not automatically attached to every web request.",
          "The app does not store your media, filenames or a history of processed files in localStorage. Your current workspace lives in memory.",
        ],
      },
      {
        title: "How to clear it",
        body: [
          "Use your browser’s site settings to delete stored data for breezyfy.com. This removes saved preferences. Reloading the page clears the temporary workspace but may keep preferences until you delete site data.",
          "Clearing site data does not delete originals or exported files in your Downloads folder. Delete those separately if you no longer want them.",
        ],
      },
      {
        title: "Hosting and future changes",
        body: [
          "The site’s hosting and security services may process ordinary web-request information as described in our Privacy Policy. An absence of app tracking cookies is not a promise that the hosting service collects no request data.",
          "There are no optional advertising or analytics integrations to switch on in this version. If those are introduced later, this notice and any required consent controls must be updated before they run.",
        ],
      },
    ],
  },
};

export const infoPages: Record<string, ContentPage> = {
  contact: {
    title: "A little help, when you need it.",
    kicker: "Contact Breezyfy",
    intro: `Questions, feedback or privacy requests? Reach us at ${siteConfig.supportEmail}.`,
    sections: [
      {
        title: "Tell us what happened",
        body: [
          "Include your browser, device, file format and the error message. A short explanation helps us understand the problem. You do not need to share your original media to report an issue.",
        ],
      },
      {
        title: "Your privacy comes first",
        body: [
          "Never email passwords, payment details or sensitive media. If you choose to send a file by email, it leaves your device and is handled by the email provider; that is separate from the local-processing editor.",
        ],
      },
      {
        title: "Privacy and acceptable-use requests",
        body: [
          "Use the same email for privacy questions or reports of misuse. Describe the request clearly and provide only the information needed to help.",
        ],
      },
    ],
  },
  guide: {
    title: "A cleaner result, step by step",
    kicker: "Quick guide",
    intro:
      "Start with the original file, inspect the mark closely, and save a result only when you are happy with it.",
    sections: [
      {
        title: "1. Add your media",
        body: [
          "Choose files, drop them into the workspace, or paste a supported image. Use an original export where possible: screenshots and repeated compression can change the pixels needed for accurate correction.",
          "Make sure you have permission to edit the content. The supported formats and size limits are shown in the workspace before processing.",
        ],
      },
      {
        title: "2. Match the visible overlay",
        body: [
          "Start with the default profile. If the mark remains, choose the pattern that most closely matches it and check its position. Position and pattern often matter more than stronger correction.",
          "If automatic placement misses the mark, set its position manually. Adjust the scale in small steps and compare the surrounding detail as well as the mark itself.",
        ],
      },
      {
        title: "3. Fine-tune and compare",
        body: [
          "Change one control at a time. A bright residue may need a better match; a dark patch can mean the correction is too strong. Wider masks and feathering can alter nearby detail.",
          "Fully opaque overlays hide information that inverse blending cannot recover. This release does not include an opaque-fill or generative inpainting tool.",
        ],
      },
      {
        title: "4. Export your result",
        body: [
          "Choose an output format supported by the workspace. PNG avoids an additional lossy image-compression step. JPEG or WebP choices may trade quality for a smaller download; resizing changes the pixel dimensions.",
          "Video must be encoded again after its frames are edited. Allow the job to finish and check the beginning, middle and end of the exported clip, including its audio.",
          "Download the files you want to keep before reloading. A batch ZIP is a convenient package for completed outputs, not cloud storage.",
        ],
      },
      {
        title: "If a file does not work",
        body: [
          "Read the error beside the file, confirm its format and size, and try its original export. An MP4 container can hold a codec your browser cannot decode or encode.",
          "Large images and long clips need memory and processing time on your device. Close unused tabs or use a smaller batch. An unfamiliar or damaged overlay may remain even after tuning.",
        ],
      },
    ],
  },
  technology: {
    title: "The work happens in your browser",
    kicker: "How it works",
    intro:
      "Breezyfy uses local pixel processing for visible overlays and browser media tools for video. It is an independent implementation, with practical limits.",
    sections: [
      {
        title: "Undoing a translucent overlay",
        body: [
          "A translucent mark mixes its colour with the background. When the pattern, opacity and placement are known well enough, reverse alpha blending can estimate the background by reversing that mixture.",
          "The estimate depends on the reference pattern and the file. Compression, clipped colours, scaling and an incorrect opacity can prevent exact recovery. Breezyfy does not claim a perfect match to every generator or watermark version.",
        ],
      },
      {
        title: "Finding and refining the region",
        body: [
          "Pattern matching helps locate a supported overlay. Manual position, scale and correction settings let you inspect and tune the region when automatic detection is uncertain.",
          "When a fully opaque mark hides the source pixels, inversion cannot recover them. Breezyfy does not offer opaque filling or generative inpainting in this release. Unsupported patterns should be left unchanged rather than represented as recovered detail.",
        ],
      },
      {
        title: "Processing a video",
        body: [
          "A video container is separated into tracks. Supported video frames are decoded, edited and encoded again, then placed into a new downloadable file. Browser codec support and your device determine which jobs can run.",
          "Audio handling depends on the supported input and output tracks. Review the exported clip. Video encoding can change visual quality, file size and metadata even when the dimensions stay the same.",
        ],
      },
      {
        title: "Local media, ordinary website requests",
        body: [
          "The app reads selected media into browser memory and produces a local download. It does not send the selected file to a remote editing service.",
          "Loading the application still requires ordinary requests to the website host. Preferences can be remembered on your device; the current media workspace is temporary.",
        ],
      },
      {
        title: "What this release does not claim",
        body: [
          "Breezyfy does not contain or claim to reproduce Erasio’s proprietary source, reference data or separate private processing pipeline. Similar underlying mathematics does not establish identical results.",
          "It is not a universal eraser, a browser extension or an Android application. It does not target invisible provenance signals and cannot certify the provenance of an exported file.",
        ],
      },
    ],
  },
  faq: {
    title: "A few things to know",
    kicker: "Frequently asked questions",
    intro:
      "Straight answers about files, quality, privacy and what this release can do.",
    sections: [
      {
        title: "Is Breezyfy free?",
        body: [
          "Yes. This release has no login, paid credits or subscription. Processing uses your own device’s resources.",
        ],
      },
      {
        title: "Are my images or videos uploaded?",
        body: [
          "The tool processes selected files in your browser. It does not upload them to an editing server. Loading the website still creates ordinary hosting requests, described in the Privacy Policy.",
        ],
      },
      {
        title: "Will every watermark disappear?",
        body: [
          "No. The tool is designed for supported visible overlay patterns. Different shapes, opaque marks, compression and inaccurate placement can leave residue or alter nearby detail. Inspect the result and keep the original.",
        ],
      },
      {
        title: "Why can a screenshot be harder to clean?",
        body: [
          "A screenshot may resize the overlay or change its pixel values. Compression and later edits can do the same. The original generated file usually gives a more reliable starting point.",
        ],
      },
      {
        title: "Will the export be identical apart from the mark?",
        body: [
          "Not necessarily. A format conversion, resize or video encode can change colour, compression, metadata and file size. PNG avoids an extra lossy image encode, but it does not restore information already missing from the input.",
        ],
      },
      {
        title: "Why does an MP4 fail on my device?",
        body: [
          "MP4 describes the container, not a single codec. Your browser must support the specific video decoder and output encoder. Available memory and hardware also matter, especially for long or high-resolution clips.",
        ],
      },
      {
        title: "Can I recover a file after refreshing?",
        body: [
          "The active workspace is temporary. Download completed results before refreshing or closing it. Breezyfy does not maintain an online media library. Your saved preferences may remain until you clear the site’s browser data.",
        ],
      },
      {
        title: "Does it remove SynthID or prove a file is human-made?",
        body: [
          "No. The tool does not target invisible provenance systems or establish how a file was made. Editing may change metadata and other file properties, so it also does not certify that all provenance information survives. Follow any required AI disclosures.",
        ],
      },
      {
        title: "Can I edit someone else’s image?",
        body: [
          "Only if you have the necessary permission. Do not strip attribution or ownership marks, avoid licence fees, or misrepresent another creator’s work as your own. Read the Acceptable Use page before processing.",
        ],
      },
    ],
  },
};
