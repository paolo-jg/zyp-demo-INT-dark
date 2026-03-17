# Zyp Dashboard

B2B payments platform for cross-border transfers between US and Philippines using USDC stablecoin rails.

## Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS
- **Backend:** Supabase (Auth, Database, Edge Functions)
- **Payments:** Cybrid (crypto rails), Plaid (bank linking)
- **Identity:** Persona (KYC/KYB verification)

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview build |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint issues |
| `npm run format` | Format with Prettier |
| `npm run format:check` | Check formatting |

## Project Structure

```
src/
├── components/
│   ├── auth/           # Landing page, authentication
│   ├── banks/          # Bank account management
│   ├── dashboard/      # Home, Transfer, Settings, History
│   ├── invoices/       # Invoice management
│   ├── kyb/            # Business verification
│   ├── onboarding/     # User onboarding flow
│   ├── philippines/    # PH user dashboard
│   ├── recipients/     # Recipient/counterparty management
│   ├── shared/         # UI components, skeletons
│   └── verification/   # Persona, Plaid modals
├── contexts/           # React contexts (Theme)
├── hooks/              # Custom hooks
│   ├── useAuth.js      # Authentication state
│   ├── useRecipients.js # Recipient CRUD
│   ├── useInvoices.js  # Invoice CRUD
│   └── useTransactions.js # Transaction management
├── utils/              # Utilities
│   ├── authSecurity.js # Session, PIN, rate limiting
│   ├── auditLog.js     # Audit logging
│   ├── cybrid.js       # Cybrid API client
│   ├── errorHandler.js # Error handling
│   ├── exportUtils.js  # CSV/PDF export
│   ├── secureLogging.js # Secure console logging
│   └── validators.js   # Input validation
└── App.jsx             # Main app component
```

## Key Features

- **Lazy Loading:** Components loaded on-demand for faster initial load
- **Security:** Input sanitization, rate limiting, secure logging, PIN verification
- **Audit Trail:** All sensitive operations logged
- **Offline Support:** Offline indicator, retry logic
- **Responsive:** Mobile-first design

## Environment Variables

Create `.env.local`:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Database Setup

Run migrations in `supabase/migrations/` or execute this SQL:

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Users can view/update own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Users can view directory for search
CREATE POLICY "Users can view directory" ON users
  FOR SELECT USING (onboarding_completed = true);

-- Recipients, invoices, transactions - users manage their own
CREATE POLICY "Users manage own recipients" ON recipients
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users manage own invoices" ON invoices
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users manage own transactions" ON transactions
  FOR ALL USING (user_id = auth.uid());
```

## Supabase Functions

Deploy edge functions from `supabase/functions/`:

- `create-customer` - Create Cybrid customer
- `create-identity-verification` - Start KYC
- `get-plaid-link-token` - Get Plaid Link token
- `link-bank-account` - Link bank via Plaid
- `create-fiat-account-us` - Create fiat account
- `create-quote` - Get transfer quote
- `create-transfer` - Execute transfer
- `get-exchange-rate` - Get USD/PHP rate
- `verify-pin` - Verify transaction PIN
- `delete-user` - Account deletion

## User Flows

### US Users (Senders)
1. Sign up → Onboarding → KYC (Persona) → Bank Link (Plaid)
2. Add recipients (PH businesses/individuals)
3. Create invoices or direct transfers
4. Transfers routed through USDC rails

### Philippines Users (Receivers)
1. Sign up → Onboarding → Add bank details
2. Add US clients
3. Create invoices for US clients
4. Receive payments to local bank

## Security

See [SECURITY.md](./SECURITY.md) for:
- Input sanitization
- Rate limiting
- Session management
- PIN verification for high-value transfers
- Audit logging
- Secure console logging

## License

Proprietary - Zyp Inc.
