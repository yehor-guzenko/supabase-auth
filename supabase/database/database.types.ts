export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string,
          email: string,
          external_id: string,
          created_at: Date;
          updated_at: Date;
        },
        Insert: {
          email: string,
          external_id: string,
        };
      },
      wallets: {
        Row: {
          id: string,
          address: string,
          user_id: string,
          created_at: Date;
          updated_at: Date;
        },
        Insert: {
          address: string,
          user_id: string,
        };
      }
    }
  }
}