// routes/incidentRoutes.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const Incident = require("../models/Incident");
const cors = require("cors");

const router = express.Router();
require("dotenv").config();
const nodemailer = require("nodemailer");
let transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "chethannv23.csedvit@gmail.com",
    pass: "adlw fxya hjxv picu",
  },
  debug: true,
});

transporter.verify((error, success) => {
  if (error) {
    console.log(error);
  } else {
    console.log("Ready for messages");
    console.log(success);
  }
});
const resolve = async (email, name, id, comment) => {
  const mailOptions = {
    from: `"noReply" <${process.env.AUTH_EMAIL}>`,
    to: email,
    subject: "Cyber Issue Resolved!!!",
    html: `
        <p>Hello ${name},</p>
        <p>Your Cyber Report with case ID <strong>${id}</strong> has been resolved.</p>
        <br />
        <p><strong>Officer Comment:</strong> ${comment}</p>
        <br />
        <p>Best regards,</p>
        <p>Billy Bot</p>
      `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Resolution email sent to ${email}`);
  } catch (error) {
    console.error("Error sending resolution email:", error);
  }
};

const report = async (email, name, id, text, file) => {
  const mailOptions = {
    from: `"noReply" <${process.env.AUTH_EMAIL}>`,
    to: email,
    subject: "Cyber Incident Reported",
    html: `
      <p>Hello ${name},</p>
      <p>Thank you for reporting a cyber incident. Here are the details:</p>
      <ul>
        <li><b>Case ID:</b> ${id}</li>
        <li><b>Description:</b> ${text}</li>
        <li><b>Description:</b> ${file}</li>
      </ul>
      <p>Our team will review the report and take appropriate action. We will notify you once the case is resolved.</p>
      <br />
      <p>Best regards,</p>
      <p>Billy Bot</p>
    `,
  };
  await transporter.sendMail(mailOptions);
};

// Set up file storage with Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads"); // Folder where files will be stored
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
  },
});

const upload = multer({ storage: storage });

// Function to validate the incident description (same as frontend)
const isValidIncidentDescription = (description) => {
  const unwantedWords = ["chat", "hello", "hi", "goodbye", "test", "spam"];
  const requiredKeywords = ["incident", "abuse", "evidence", "report"];

  // Check if the description contains any unwanted words
  for (let word of unwantedWords) {
    if (description.toLowerCase().includes(word)) {
      return false;
    }
  }

  // Check if the description contains at least one relevant keyword
  for (let keyword of requiredKeywords) {
    if (description.toLowerCase().includes(keyword)) {
      return true;
    }
  }

  return false;
};

// Route to store incident and file
router.post("/store-incident", upload.single("file"), async (req, res) => {
  const { email, incidentText, username, filePath } = req.body; // Include username in the destructuring

  // Validate the incident description and username
  if (!incidentText || !username) {
    return res.status(400).json({
      error:
        "Invalid input. Both username and incident description are required.",
    });
  }

  // Create a new incident document
  const newIncident = new Incident({
    email,
    username, // Save the username
    text: incidentText,
    file: filePath,
  });

  try {
    await newIncident.save();
    await report(
      email,
      username, // Assuming the username is used as the user's name
      newIncident._id,
      incidentText,
      newIncident.file
    );
    res.json({ success: true, message: "Incident stored successfully!" });
  } catch (err) {
    console.error("Error storing incident:", err);
    res
      .status(500)
      .json({ error: "Failed to store incident. Please try again." });
  }
});
router.patch("/mark-inactive/:username/:recordId", async (req, res) => {
  try {
    const result = await Incident.findByIdAndUpdate(
      req.params.recordId,
      { isActive: false },
      { new: true } // Return the updated document
    );
    if (result) {
      res.json({
        success: true,
        message: "Record marked as inactive successfully",
        record: result,
      });
    } else {
      res.status(404).send("Record not found");
    }
  } catch (error) {
    console.error("Error updating record:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/get-history-records/:username", async (req, res) => {
  try {
    const records = await Incident.find({
      username: req.params.username,
      isActive: false,
    });
    res.json({ success: true, records });
  } catch (error) {
    console.error("Error fetching history records:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Error handling for file upload
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

router.get("/get-active-records/:username", async (req, res) => {
  try {
    const username = req.params.username;
    const count = await Incident.countDocuments({
      username: username,
      isActive: true,
    });

    res.json({ success: true, count });
  } catch (err) {
    console.error("Error fetching active records:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch active records." });
  }
});
router.use("/uploads", express.static(path.join(__dirname, "uploads")));

router.get("/files/:filename", (req, res) => {
  const filename = req.params.filename;
  const directoryPath = path.join(__dirname, "uploads");
  const filePath = path.join(directoryPath, filename);
  console.log("Trying to send file:", filePath);
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error("Error sending file:", err);
      res.status(err.status || 500).send(err.message);
    }
  });
});

router.get("/get-all-active-records/:username", async (req, res) => {
  try {
    const username = req.params.username;
    const records = await Incident.find({
      username: username,
      isActive: true,
    }).sort({ timestamp: -1 }); // Sorting by timestamp desc

    res.json({ success: true, records });
  } catch (err) {
    console.error("Error fetching all active records:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch all active records." });
  }
});
router.get("/get-all-active", async (req, res) => {
  try {
    const records = await Incident.find({ isActive: true }).sort({
      timestamp: 1,
    }); // Sorting by timestamp desc
    res.json({ success: true, records });
  } catch (err) {
    console.error("Error fetching all records:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch all records." });
  }
});
router.get("/get-all-innactive", async (req, res) => {
  try {
    const records = await Incident.find({ isActive: false }).sort({
      timestamp: 1,
    }); // Sorting by timestamp desc
    res.json({ success: true, records });
  } catch (err) {
    console.error("Error fetching all records:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch all records." });
  }
});

router.patch("/resolve/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    if (!comment) {
      return res
        .status(400)
        .json({ success: false, message: "Comment is required." });
    }

    // Find the record to get email and name
    const record = await Incident.findById(id);
    if (!record) {
      return res
        .status(404)
        .json({ success: false, message: "Record not found." });
    }

    const updatedRecord = await Incident.findByIdAndUpdate(
      id,
      { isActive: false, comment, resolvedAt: new Date() },
      { new: true }
    );

    if (!updatedRecord) {
      return res
        .status(404)
        .json({ success: false, message: "Failed to update record." });
    }

    await resolve(record.email, record.name, record._id, comment);

    res.json({ success: true, record: updatedRecord });
  } catch (error) {
    console.error("Error resolving record:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to resolve record." });
  }
});

router.use(cors());
module.exports = router;
