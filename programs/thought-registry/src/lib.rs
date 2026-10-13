use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, CloseAccount, Mint, Token, TokenAccount, Transfer};

declare_id!("ThouGhtReg1stry1111111111111111111111111111");

#[program]
pub mod thought_registry {
    use super::*;

    pub fn register_thought(
        ctx: Context<RegisterThought>,
        content_hash: [u8; 32],
    ) -> Result<()> {
        let record = &mut ctx.accounts.thought_record;
        record.author = ctx.accounts.author.key();
        record.mint = ctx.accounts.mint.key();
        record.content_hash = content_hash;
        record.timestamp = Clock::get()?.unix_timestamp;
        record.bump = ctx.bumps.thought_record;

        msg!("Thought registered on-chain for mint: {:?}", record.mint);
        Ok(())
    }

    pub fn list_thought(ctx: Context<ListThought>, price_lamports: u64) -> Result<()> {
        require!(price_lamports > 0, MarketplaceError::InvalidPrice);

        let bump = ctx.bumps.listing;
        let mint_key = ctx.accounts.mint.key();
        let seller_key = ctx.accounts.seller.key();
        {
            let listing = &mut ctx.accounts.listing;
            listing.seller = seller_key;
            listing.mint = mint_key;
            listing.price_lamports = price_lamports;
            listing.bump = bump;
        }

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.seller_token_account.to_account_info(),
                    to: ctx.accounts.escrow_token_account.to_account_info(),
                    authority: ctx.accounts.seller.to_account_info(),
                },
            ),
            1,
        )?;

        msg!("Listed mint {:?} for {} lamports (bump {})", mint_key, price_lamports, bump);
        Ok(())
    }

    pub fn buy_thought(ctx: Context<BuyThought>) -> Result<()> {
        require!(
            ctx.accounts.buyer.key() != ctx.accounts.listing.seller,
            MarketplaceError::SellerCannotBuy
        );

        let price = ctx.accounts.listing.price_lamports;
        let bump = ctx.accounts.listing.bump;
        let mint_key = ctx.accounts.mint.key();

        anchor_lang::solana_program::program::invoke(
            &anchor_lang::solana_program::system_instruction::transfer(
                ctx.accounts.buyer.key,
                ctx.accounts.seller.key,
                price,
            ),
            &[
                ctx.accounts.buyer.to_account_info(),
                ctx.accounts.seller.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        let seeds: &[&[u8]] = &[b"listing", mint_key.as_ref(), &[bump]];
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.escrow_token_account.to_account_info(),
                    to: ctx.accounts.buyer_token_account.to_account_info(),
                    authority: ctx.accounts.listing.to_account_info(),
                },
                &[seeds],
            ),
            1,
        )?;

        token::close_account(CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            CloseAccount {
                account: ctx.accounts.escrow_token_account.to_account_info(),
                destination: ctx.accounts.seller.to_account_info(),
                authority: ctx.accounts.listing.to_account_info(),
            },
            &[seeds],
        ))?;

        Ok(())
    }

    pub fn cancel_listing(ctx: Context<CancelListing>) -> Result<()> {
        let bump = ctx.accounts.listing.bump;
        let mint_key = ctx.accounts.mint.key();
        let seeds: &[&[u8]] = &[b"listing", mint_key.as_ref(), &[bump]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.escrow_token_account.to_account_info(),
                    to: ctx.accounts.seller_token_account.to_account_info(),
                    authority: ctx.accounts.listing.to_account_info(),
                },
                &[seeds],
            ),
            1,
        )?;

        token::close_account(CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            CloseAccount {
                account: ctx.accounts.escrow_token_account.to_account_info(),
                destination: ctx.accounts.seller.to_account_info(),
                authority: ctx.accounts.listing.to_account_info(),
            },
            &[seeds],
        ))?;

        Ok(())
    }
}

#[account]
pub struct ThoughtRecord {
    pub author: Pubkey,         // 32
    pub mint: Pubkey,           // 32
    pub content_hash: [u8; 32], // 32
    pub timestamp: i64,         // 8
    pub bump: u8,               // 1
}

#[derive(Accounts)]
pub struct RegisterThought<'info> {
    #[account(
        init,
        payer = author,
        space = 8 + 32 + 32 + 32 + 8 + 1,
        seeds = [b"thought", mint.key().as_ref()],
        bump
    )]
    pub thought_record: Account<'info, ThoughtRecord>,
    /// CHECK: Validated against NFT mint pubkey
    pub mint: AccountInfo<'info>,
    #[account(mut)]
    pub author: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Listing {
    pub seller: Pubkey,       // 32
    pub mint: Pubkey,         // 32
    pub price_lamports: u64,  // 8
    pub bump: u8,             // 1
}

#[derive(Accounts)]
pub struct ListThought<'info> {
    #[account(
        init,
        payer = seller,
        space = 8 + 32 + 32 + 8 + 1,
        seeds = [b"listing", mint.key().as_ref()],
        bump
    )]
    pub listing: Account<'info, Listing>,
    #[account(mut)]
    pub seller: Signer<'info>,
    pub mint: Account<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = seller,
    )]
    pub seller_token_account: Account<'info, TokenAccount>,
    #[account(
        init,
        payer = seller,
        associated_token::mint = mint,
        associated_token::authority = listing,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BuyThought<'info> {
    #[account(
        mut,
        seeds = [b"listing", mint.key().as_ref()],
        bump = listing.bump,
        has_one = seller,
        has_one = mint,
        close = seller,
    )]
    pub listing: Account<'info, Listing>,
    /// CHECK: Seller pubkey is checked with has_one = seller.
    #[account(mut)]
    pub seller: AccountInfo<'info>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    pub mint: Account<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = listing,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = buyer,
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelListing<'info> {
    #[account(
        mut,
        seeds = [b"listing", mint.key().as_ref()],
        bump = listing.bump,
        has_one = seller,
        has_one = mint,
        close = seller,
    )]
    pub listing: Account<'info, Listing>,
    #[account(mut)]
    pub seller: Signer<'info>,
    pub mint: Account<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = listing,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = seller,
    )]
    pub seller_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[error_code]
pub enum MarketplaceError {
    #[msg("Price must be greater than zero")]
    InvalidPrice,
    #[msg("Seller cannot buy their own listing")]
    SellerCannotBuy,
}
