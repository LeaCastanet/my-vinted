const express = require("express");
const fileUpload = require("express-fileupload"); // Import de fileupload qui nous permet de recevoir des formdata
const cloudinary = require("cloudinary").v2; // Import de cloudinary
const encBase64 = require("crypto-js/enc-base64");

const router = express.Router();

const User = require("../models/User");
const Offer = require("../models/Offer");

const convertToBase64 = (file) => {
  return `data:${file.mimetype};base64,${file.data.toString("base64")}`;
};

const isAuthenticated = require("../middlewares/isAuthenticated");

router.post(
  "/offer/publish",
  isAuthenticated,
  fileUpload(),
  async (req, res) => {
    try {
      const newOffer = await new Offer({
        product_name: req.body.title,
        product_description: req.body.description,
        product_price: req.body.price,
        product_details: {
          condition: req.body.condition,
          city: req.body.city,
          brand: req.body.brand,
          size: req.body.size,
          color: req.body.color,
        },
        owner: req.user._id,
      });

      if (req.body.description.length > 500) {
        return res
          .status(400)
          .json({ message: "Your description is too long" });
      }
      if (req.body.title.length > 50) {
        return res.status(400).json({ message: "Your title is too long" });
      }

      if (req.body.price.length > 6) {
        return res
          .status(400)
          .json({ message: "Your price can't bee superior to 100000" });
      }
      if (req.files?.picture) {
        //ici je verifie qu'il y a bien un files et ensuite si oui, qu'il y a bien une picture
        //console.log("newOffer:", newOffer);
        const pictureConverted = convertToBase64(req.files.picture);
        const result = await cloudinary.uploader.upload(pictureConverted, {
          folder: `/vinted/offers/${newOffer._id}`,
        });

        newOffer.product_image = result;
      }

      await newOffer.save();

      //console.log("result:", result);
      //console.log("secure:", newOffer);
      res.status(200).json({
        _id: newOffer._id,
        product_name: req.body.title,
        product_description: req.body.description,
        product_price: req.body.price,
        product_details: [
          {
            MARQUE: req.body.brand,
          },
          {
            TAILLE: req.body.size,
          },
          {
            ÉTAT: req.body.condition,
          },
          {
            COULEUR: req.body.color,
          },
          {
            EMPLACEMENT: req.body.city,
          },
        ],
        owner: {
          account: {
            username: req.user.account.username,
          },
          _id: req.user._id,
        },
        product_image: {
          secure_url: newOffer.product_image.secure_url,
        },
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.put("/offer/modify/:offerId", isAuthenticated, async (req, res) => {
  try {
    const offerId = req.params.offerId;
    const {
      product_name,
      product_description,
      product_price,
      condition,
      city,
      brand,
      size,
      color,
    } = req.body;
    const offerToModify = await Offer.findById(offerId);
    // console.log(offerToModify);
    if (product_name) {
      offerToModify.product_name = product_name;
    }
    if (product_description) {
      offerToModify.product_description = product_description;
    }
    if (product_price) {
      offerToModify.product_price = product_price;
    }
    if (condition) {
      offerToModify.product_details.condition = procduct_condition;
    }
    if (city) {
      offerToModify.product_details.city = product_city;
    }
    if (brand) {
      offerToModify.product_details.brand = product_brand;
    }
    if (size) {
      offerToModify.product_details.size = product_size;
    }
    if (color) {
      offerToModify.product_details.color = product_color;
    }
    await offerToModify.save();
    res.status(200).json(offerToModify);
  } catch (error) {
    res.json({ message: error.message });
  }
});

router.delete("/offer/delete/:offerId", isAuthenticated, async (req, res) => {
  try {
    const offerId = req.params.offerId;
    await Offer.findByIdAndDelete(offerId);
    res.status(200).json({ message: "Offer deleted" });
  } catch (error) {
    res.json({ message: error.message });
  }
});

router.get("/offer/:id", async (req, res) => {
  try {
    const offerId = req.params.id;
    const offerToFind = await Offer.findById(offerId).populate(
      "owner",
      "acount_id"
    );
    res.status(200).json(offerToFind);
  } catch (error) {
    res.json({ message: error.message });
  }
});

router.get("/offers", async (req, res) => {
  try {
    const { title, priceMin, priceMax, sort, page } = req.query;
    const regExp = new RegExp(title, "i");
    if (sort !== "price-desc" && sort !== "price-asc") {
      return res
        .status(400)
        .json({ message: "You need to enter price-desc or price-asc" });
    }

    const filters = {};

    if (title) {
      filters.product_name = regExp;
    }
    if (priceMin && priceMax) {
      filters.product_price = {
        $gte: Number(priceMin),
        $lte: Number(priceMax),
      };
    } else {
      if (priceMin) {
        filters.product_price = { $gte: Number(priceMin) };
      }
      if (priceMax) {
        filters.product_price = { $lte: Number(priceMax) };
      }
    }

    //console.log(filters);

    const limit = 5;
    let pageRequired = 1;
    if (page) {
      pageRequired = Number(page);
    }
    const skip = (pageRequired - 1) * limit;

    const offers = await Offer.find(filters)
      .populate("owner", "acount_id")
      .sort({ product_price: 1 })
      .skip(skip)
      .limit(limit)
      .select("product_name product_price -_id");

    const offersCount = await Offer.countDocuments(filters);

    res.status(200).json({ count: offersCount, offers: offers });
  } catch (error) {
    res.json({ message: error.message });
  }
});

module.exports = router;
