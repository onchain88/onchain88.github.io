# onchain88 Members SBT Deployment Log

## Private Chain Deployment

### Deployment Information

- **Date**: 2025-08-08
- **Network**: onchain88 Private Chain
- **Chain ID**: 21201 (0x52d1)
- **RPC URL**: http://dev2.bon-soleil.com/rpc
- **Contract Address**: `0x166748e744195650a94FC32C64d8f0c9329f96F1`
- **Deployer**: [Deployer Address]
- **Compiler Version**: 0.8.19
- **Optimization**: Enabled (200 runs)

### Contract Features

- Soul Bound Token (Non-transferable)
- Free minting (gas only)
- One token per address
- User profile support (memberName, discordId, avatarImage)
- Default avatar (base64 SVG)
- Owner-only burn function

### Deployment Transaction

- **Transaction Hash**: [To be filled]
- **Gas Used**: [To be filled]
- **Gas Price**: [To be filled]

### Verification Status

- Contract verified on private chain
- ABI available at: `./onchain88MembersSBT_ABI.json`

### Post-Deployment Actions

1. ✅ Contract address updated in frontend config
2. ✅ Documentation updated
3. ⏳ Testing on private chain
4. ⏳ User profile feature testing

## Polygon Mainnet Deployment (Future)

### Pre-deployment Checklist

- [ ] Audit completed
- [ ] Gas optimization tested
- [ ] FORCE_PRIVATE_CHAIN flag set to false
- [ ] Production contract address ready
- [ ] Deployment script prepared

### Deployment Information

- **Date**: TBD
- **Network**: Polygon Mainnet
- **Chain ID**: 137 (0x89)
- **Contract Address**: TBD
- **Explorer**: https://polygonscan.com/address/[TBD]

---

## Notes

- Remember to update FORCE_PRIVATE_CHAIN to false before Polygon deployment
- Ensure sufficient MATIC for deployment gas fees
- Test all features thoroughly on private chain first
