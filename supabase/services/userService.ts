import { createClient, SupabaseClient } from "npm:@supabase/supabase-js";
import { Payload } from "https://deno.land/x/djwt@v3.0.1/mod.ts";
import "https://deno.land/x/dotenv@v3.2.2/load.ts";

interface Wallet {
  address: string;
}

interface DecodedTokenPayload extends Omit<Payload, 'verified_credentials'> {
  email: string;
}

class UserService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SERVICE_KEY") ?? "");
  }

  async createUserWithCreds(verifiedAddress: string[], verifiedData: DecodedTokenPayload): Promise<any> {
    try {
      const { data: user } = await this.supabase
        .from('users')
        .insert([
          { email: verifiedData.email, external_id: verifiedData.sub },
        ])
        .select("*")
        .single();

        verifiedAddress.forEach(async address => {
        await this.supabase
          .from("wallets")
          .insert([
            { user_id: user.id, address }
          ]);
      })

      return user;
    } catch (error) {
      throw new Error("Failed to create user in Supabase: " + error.message);
    }
  }

  async getUserByEmail(email: string) {
    return await this.supabase
      .from("users")
      .select(`*, wallets (address)`)
      .eq("email", email)
      .single();
  }

  async updateUserWallets(userId: number, verifiedAddress: string[]): Promise<void> {
    try {
      const existingWallets = await this.getWalletsByUserId(userId);
      const existingAddresses = existingWallets?.map((wallet: Wallet) => wallet.address) || [];

      const walletsToDelete = existingWallets?.filter(wallet => !verifiedAddress.includes(wallet.address)) || [];
      for (const wallet of walletsToDelete) {
        await this.supabase
          .from("wallets")
          .delete()
          .eq("address", wallet.address);
      }

      const walletsToInsert = verifiedAddress.filter(address => !existingAddresses.includes(address));
      for (const address of walletsToInsert) {
        await this.supabase
          .from("wallets")
          .insert([{ user_id: userId, address }]);
      }
    } catch (error) {
      throw new Error("Failed to update user wallets in Supabase: " + error.message);
    }
  }

  private async getWalletsByUserId(userId: number) {
    try {
      const { data: wallets } = await this.supabase
        .from("wallets")
        .select("address")
        .eq("user_id", userId);
      return wallets;
    } catch (error) {
      throw new Error("Failed to fetch user wallets from Supabase: " + error.message);
    }
  }
}

export default new UserService();
