const Booking = require("../models/Booking");
const transporter = require("../utils/email");

// ============================================================
// SUBMIT BOOKING
// ============================================================

const submitBooking = async (req, res) => {
  try {
    const {
      firstname,
      lastname,
      email,
      phone,
      pickup,
      delivery,
      vehicle,
      date,
    } = req.body;

    console.log("");
    console.log("==============================================");
    console.log("🚚 NEW LOGISTICS BOOKING RECEIVED");
    console.log("==============================================");

    console.log("Customer:", `${firstname} ${lastname}`);
    console.log("Email:", email);
    console.log("Phone:", phone);
    console.log("Pickup:", pickup);
    console.log("Delivery:", delivery);
    console.log("Vehicle:", vehicle);
    console.log("Date:", date);

    // ========================================================
    // VALIDATION
    // ========================================================

    if (
      !firstname ||
      !lastname ||
      !email ||
      !phone ||
      !pickup ||
      !delivery ||
      !vehicle ||
      !date
    ) {
      console.log("❌ Booking validation failed");

      return res.status(400).json({
        success: false,
        message: "Please complete all booking fields.",
      });
    }

    // ========================================================
    // GENERATE ORDER ID
    // ========================================================

    const orderId = `SAM-${Date.now()}`;

    console.log("🆔 Order ID:", orderId);

    // ========================================================
    // SAVE BOOKING TO MONGODB
    // ========================================================

    console.log("💾 Saving booking to MongoDB...");

    const booking = await Booking.create({
      orderId,

      firstname: firstname.trim(),

      lastname: lastname.trim(),

      email: email.trim().toLowerCase(),

      phone: phone.trim(),

      pickup: pickup.trim(),

      delivery: delivery.trim(),

      vehicle: vehicle.trim(),

      date: new Date(date),

      status: "Pending",

      adminEmailSent: false,

      customerEmailSent: false,

      whatsappSent: false,
    });

    console.log("✅ Booking saved to MongoDB");

    console.log("MongoDB Booking ID:", booking._id);

    // ========================================================
    // ADMIN EMAIL
    // ========================================================

    const adminEmail =
      process.env.ADMIN_EMAIL ||
      "info@samchilowmultibiz.com";

    console.log("📧 Booking recipient:", adminEmail);

    const adminMail = {
      from: `"Samchilow Logistics" <${process.env.EMAIL_USER}>`,

      to: adminEmail,

      replyTo: email,

      subject: `New Logistics Booking - ${orderId}`,

      html: `
        <!DOCTYPE html>

        <html>

        <body
          style="
            margin:0;
            padding:30px;
            background:#f5f5f5;
            font-family:Arial,Helvetica,sans-serif;
          "
        >

          <div
            style="
              max-width:700px;
              margin:auto;
              background:#ffffff;
              border-radius:12px;
              overflow:hidden;
              box-shadow:0 4px 20px rgba(0,0,0,0.08);
            "
          >

            <div
              style="
                background:#000000;
                padding:30px;
                text-align:center;
              "
            >

              <h1
                style="
                  margin:0;
                  color:#D4AF37;
                  font-size:26px;
                "
              >
                SAMCHILOW LOGISTICS
              </h1>

              <p
                style="
                  margin:10px 0 0;
                  color:#ffffff;
                  font-size:14px;
                "
              >
                New Truck Booking
              </p>

            </div>

            <div style="padding:35px;">

              <h2 style="color:#111111;">
                Booking Information
              </h2>

              <p>
                <strong>Order ID:</strong>
                ${orderId}
              </p>

              <hr
                style="
                  border:none;
                  border-top:1px solid #eeeeee;
                  margin:25px 0;
                "
              />

              <p>
                <strong>Customer Name:</strong>
                ${firstname} ${lastname}
              </p>

              <p>
                <strong>Email:</strong>
                ${email}
              </p>

              <p>
                <strong>Phone:</strong>
                ${phone}
              </p>

              <p>
                <strong>Pickup Location:</strong>
                ${pickup}
              </p>

              <p>
                <strong>Delivery Location:</strong>
                ${delivery}
              </p>

              <p>
                <strong>Vehicle Type:</strong>
                ${vehicle}
              </p>

              <p>
                <strong>Booking Date:</strong>
                ${date}
              </p>

              <p>
                <strong>Status:</strong>
                Pending
              </p>

              <div
                style="
                  margin-top:30px;
                  padding:20px;
                  background:#fff9e6;
                  border-left:4px solid #D4AF37;
                "
              >

                <strong>
                  Reply to this customer:
                </strong>

                <p>
                  Click <strong>Reply</strong> in your email
                  application to respond directly to:
                </p>

                <strong>${email}</strong>

              </div>

            </div>

            <div
              style="
                background:#111111;
                padding:20px;
                text-align:center;
                color:#999999;
                font-size:12px;
              "
            >

              Samchilow Logistics

              <br />

              Reliable Logistics & Transportation Solutions

            </div>

          </div>

        </body>

        </html>
      `,
    };

    // ========================================================
    // SEND ADMIN EMAIL
    // ========================================================

    console.log("📤 Sending booking to admin...");

    try {
      await transporter.sendMail(adminMail);

      await Booking.findByIdAndUpdate(
        booking._id,
        {
          adminEmailSent: true,
        }
      );

      console.log("✅ Admin email delivered.");

    } catch (emailError) {

      console.error(
        "❌ Admin email failed:",
        emailError
      );

      // Booking remains in MongoDB even if email fails.
    }

    // ========================================================
    // CUSTOMER CONFIRMATION EMAIL
    // ========================================================

    const customerMail = {
      from: `"Samchilow Logistics" <${process.env.EMAIL_USER}>`,

      to: email,

      subject: `Booking Received - ${orderId}`,

      html: `
        <!DOCTYPE html>

        <html>

        <body
          style="
            margin:0;
            padding:30px;
            background:#f5f5f5;
            font-family:Arial,Helvetica,sans-serif;
          "
        >

          <div
            style="
              max-width:650px;
              margin:auto;
              background:#ffffff;
              padding:35px;
              border-radius:12px;
            "
          >

            <h2 style="color:#D4AF37;">
              Booking Received
            </h2>

            <p style="color:#444; line-height:1.8;">
              Dear ${firstname} ${lastname},
            </p>

            <p style="color:#444; line-height:1.8;">
              Thank you for choosing
              <strong>Samchilow Logistics</strong>.
            </p>

            <p style="color:#444; line-height:1.8;">
              We have successfully received your truck
              booking request.
            </p>

            <div
              style="
                margin:25px 0;
                padding:20px;
                background:#f8f8f8;
                border-left:4px solid #D4AF37;
              "
            >

              <p>
                <strong>Order ID:</strong>
                ${orderId}
              </p>

              <p>
                <strong>Pickup:</strong>
                ${pickup}
              </p>

              <p>
                <strong>Delivery:</strong>
                ${delivery}
              </p>

              <p>
                <strong>Vehicle:</strong>
                ${vehicle}
              </p>

              <p>
                <strong>Date:</strong>
                ${date}
              </p>

              <p>
                <strong>Status:</strong>
                Pending
              </p>

            </div>

            <p style="color:#444; line-height:1.8;">

              Our team will review your booking and
              contact you shortly.

            </p>

            <p style="color:#444; line-height:1.8;">

              Kind regards,

              <br />

              <strong>
                Samchilow Logistics
              </strong>

            </p>

          </div>

        </body>

        </html>
      `,
    };

    // ========================================================
    // SEND CUSTOMER EMAIL
    // ========================================================

    console.log("📤 Sending confirmation to customer...");

    try {
      await transporter.sendMail(customerMail);

      await Booking.findByIdAndUpdate(
        booking._id,
        {
          customerEmailSent: true,
        }
      );

      console.log("✅ Customer confirmation delivered.");

    } catch (emailError) {

      console.error(
        "❌ Customer confirmation failed:",
        emailError
      );

      // Booking remains saved.
    }

    // ========================================================
    // SUCCESS
    // ========================================================

    console.log("");
    console.log("==============================================");
    console.log("✅ BOOKING COMPLETED");
    console.log("==============================================");
    console.log("");

    return res.status(200).json({
      success: true,

      message:
        "Your booking has been submitted successfully. Our team will contact you shortly.",

      orderId,

      bookingId: booking._id,
    });

  } catch (error) {

    console.log("");
    console.error("==============================================");
    console.error("❌ BOOKING API ERROR");
    console.error("==============================================");

    console.error("Message:", error.message);
    console.error("Code:", error.code);
    console.error("Full Error:", error);

    console.error("==============================================");
    console.log("");

    return res.status(500).json({
      success: false,

      message:
        "Booking could not be submitted. Please try again.",
    });
  }
};


// ============================================================
// EXPORT
// ============================================================

module.exports = {
  submitBooking,
};