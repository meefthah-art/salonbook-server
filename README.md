# SalonBook Server

REST API for the SalonBook salon appointment booking platform. Built with Express.js and MongoDB.

**Live API:** add your Render link here
**Client repository:** add your client repo link here
**Live website:** add your Vercel link here

## Important Features
- JWT authentication using HTTPOnly cookies, with the role and blocked status checked from the database on every protected request
- Public service browsing with search, category filter, price sorting and pagination
- Admin APIs to add, update, delete and activate or deactivate services
- Appointment booking with duplicate time slot checks
- Admin can confirm or cancel appointments, block or unblock customers
- Stripe Checkout for confirmed appointments
- Payment status is changed only after a verified Stripe webhook event
- Read-only transactions list for the admin

## Technology Stack
Node.js, Express.js, MongoDB (native driver), JSON Web Token, Stripe

## Installation
```
git clone <this repo>
cd salonbook-server
npm install
```

## Run Locally
1. Copy `.env.example` to `.env` and fill in the values
2. Add the demo services: `npm run seed`
3. Start the server: `npm run dev`
4. For Stripe webhooks on localhost use the Stripe CLI: `stripe listen --forward-to localhost:5000/api/payments/webhook`
5. To make an admin: sign up on the website first, then run 
`npm run make-admin -- your@email.com`

## Environment Variables
Names only:
- `PORT`
- `NODE_ENV`
- `MONGODB_URI`
- `DB_NAME`
- `JWT_SECRET`
- `INTERNAL_SECRET`
- `CLIENT_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
