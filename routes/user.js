const express = require("express");
const uid2 = require("uid2"); // Package qui sert à créer des string aléatoires
const SHA256 = require("crypto-js/sha256"); // Sert à encripter une string
const encBase64 = require("crypto-js/enc-base64"); // Sert à transformer l'encryptage en string

// Import de fileupload qui nous permet de recevoir des formdata
const fileUpload = require("express-fileupload");
// Import de cloudinary
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: "du5fspkg6",
  api_key: "324493517458347",
  api_secret: "xBcEqilqJfP8rjPV_0kOOsyiYlc",
  secure: true,
});

const convertToBase64 = (file) => {
  return `data:${file.mimetype};base64,${file.data.toString("base64")}`;
};

const router = express.Router();

const User = require("../models/User");

router.post("/user/signup", fileUpload(), async (req, res) => {
  try {
    console.log(typeof req.body.newsletter);

    if (
      !req.body.username ||
      !req.body.email ||
      !req.body.password ||
      (req.body.newsletter !== false &&
        req.body.newsletter !== true &&
        req.body.newsletter !== "false" &&
        req.body.newsletter !== "true")
    ) {
      return res.status(400).json({ message: "Missing parameter" });
    }

    const password = req.body.password;
    const salt = uid2(16);
    const hash = SHA256(salt + password).toString(encBase64);
    const token = uid2(64);

    const existingEmail = await User.findOne({ email: req.body.email });
    if (existingEmail === null) {
      const newUser = await new User({
        email: req.body.email,
        account: {
          username: req.body.username,
          // avatar: Object, // nous verrons plus tard comment uploader une image
        },
        newsletter: req.body.newsletter,
        token: token,
        hash: SHA256(salt + password).toString(encBase64),
        salt: salt,
      });

      const avatarConverted = convertToBase64(req.files.avatar);
      const result = await cloudinary.uploader.upload(avatarConverted, {
        folder: `/vinted/user/${newUser._id}`,
      });

      newUser.account.avatar = result;

      await newUser.save();
      // console.log(newUser);
      res.json({
        id: newUser._id,
        token: newUser.token,
        account: {
          username: req.body.username,
        },
      });
    } else {
      res.status(409).json({ message: "Email already used" });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/user/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const email = req.body.email;
    const password = req.body.password;
    const salt = user.salt;
    const hash = user.hash;
    // console.log(user);
    // console.log(salt);
    // console.log(hash);
    const newHash = SHA256(salt + password).toString(encBase64);
    // console.log(newHash);
    if (newHash === hash) {
      //console.log("On peut se connecter");
      res.json({
        id: user._id,
        token: user.token,
        account: {
          username: user.account.username,
        },
      });
    } else {
      //console.log("Unauthorized");
      res.status(401).json({ message: "Unauthorized" });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
