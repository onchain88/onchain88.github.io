// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts@4.9.0/token/ERC721/extensions/IERC721Enumerable.sol";
import "@openzeppelin/contracts@4.9.0/interfaces/IERC2981.sol";

/**
 * @title Ionchain88NFT
 * @notice Interface for onchain88 NFT contract (Optimized version)
 */
interface Ionchain88NFT is IERC721Enumerable, IERC2981 {
    // Events
    event TokenMinted(uint256 indexed tokenId, address indexed to, address indexed creator);
    event TokenBurned(uint256 indexed tokenId);
    event Locked(uint256 indexed tokenId);

    // Core Functions
    function mint(
        address to,
        string memory uri,
        bool isLockedToken
    ) external payable returns (uint256);

    function burn(uint256 tokenId) external;

    // View Functions
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function mintFee() external view returns (uint256);
    function tokenLocked(uint256 tokenId) external view returns (bool);
    function tokenCreator(uint256 tokenId) external view returns (address);
    function isLocked(uint256 tokenId) external view returns (bool);
    function tokenURI(uint256 tokenId) external view returns (string memory);

    // Creator Functions
    function tokensOfCreator(address creator) external view returns (uint256[] memory);
    function creatorTokenCount(address creator) external view returns (uint256);

    // Type Filtering Functions
    function getNormalTokens() external view returns (uint256[] memory);
    function getSBTTokens() external view returns (uint256[] memory);

    // Admin Functions
    function setName(string memory newName) external;
    function setSymbol(string memory newSymbol) external;
    function setMintFee(uint256 fee) external;
    function withdraw() external;
    function setDefaultRoyalty(address receiver, uint96 feeNumerator) external;
    function setTokenRoyalty(uint256 tokenId, address receiver, uint96 feeNumerator) external;
}