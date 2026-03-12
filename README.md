# ⚠️WORK IN PROGRESS⚠️
# 👕E-kaltsukas
- The Secondhand Clothing Marketplace App is a mobile platform that allows users to easily buy and sell pre-owned clothing. Inspired by apps like Depop and Vinted, users can create listings, upload photos, set prices, and communicate with buyers or sellers through real-time chat.

The app promotes **sustainable fashion** by encouraging people to **reuse and resell clothing instead of discarding it**.

### 🛠 Tech Stack

- **Mobile App:** React Native (Expo)
- **Backend:** Node.js + Express
- **Database:** PostgreSQL (Supabase)
- **Image Storage:** Cloudinary
- **Payments:** Stripe
- **Real-time Messaging:** Socket.IO

---

# 🚀 Core Features (MVP)

## 👤 User Accounts & Profiles

- User registration and login  
  - Email authentication  
  - Social login (Google, Apple, Facebook)

- Profile customization
  - Profile photo
  - Bio
  - Location
  - Social links

- User rating & reviews (after completed transactions)

- View other users' profiles
  - Listings
  - Reviews
  - Sold items

---

## 👕 Listings (Sell & Browse Items)

### Create Listings
Users can create product listings by:

- Uploading multiple photos (Cloudinary)
- Adding:
  - Title
  - Description
  - Price
  - Condition
  - Size
  - Brand
  - Category
- Toggle item status:
  - New
  - Used

### Browse Listings

- Infinite scroll or paginated feed
- Filter and sorting options:
  - Category
  - Size
  - Price
  - Location
  - Brand
  - Newest
- Search bar with keyword filtering

### Product Details Page

Each item includes:

- Item description
- Seller information
- **View Profile** link
- **Chat** or **Make Offer** button
- Related / recommended items

---

## 💬 Chat System

Real-time messaging between buyers and sellers.

Features include:

- 1:1 messaging using **Socket.IO**
- Typing indicators
- Message timestamps
- Push notifications for new messages
- Optional photo attachments in messages

---

## 💰 Payment & Transaction System

Integrated payment system using **Stripe**.

Features include:

- In-app checkout process
- Secure payments
- Transaction flow:
  - Buyer pays
  - Funds are held
  - Seller ships item
  - Seller receives payout

Transaction tracking:

- Pending
- Shipped
- Delivered
- Completed

Additional features:

- Order history (buyer & seller)
- Refund and dispute placeholder system

---

## 🏠 Home Feed & Discovery

Users can explore items through a personalized feed.

Features include:

- Recently added items
- Trending listings
- Items near the user
- Category tabs:
  - Tops
  - Shoes
  - Accessories
  - etc.

Users can also:

- ❤️ Like items
- ⭐ Save items to favorites

---

## 🛒 Shopping & Selling Dashboard

### Buyer Dashboard

- Purchase history
- Favorite items
- Access to chat conversations

### Seller Dashboard

- Active listings
- Sold items
- Pending payments

---

## 🔒 Security & Authentication

The app includes basic security and authentication mechanisms.

- JWT-based authentication
- Secure token system
- Password reset via email

Moderation tools:

- Report / flag listings
- Report users
