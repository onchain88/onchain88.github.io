// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title Ionchain88MembersSBT
 * @notice Interface for onchain88 Members Soul Bound Token
 */
interface Ionchain88MembersSBT {
    // Events
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Mint(address indexed to, uint256 indexed tokenId);
    event Burn(uint256 indexed tokenId);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event UserInfoUpdated(address indexed user, string memberName, string discordId, string avatarImage);

    // User information structure
    struct UserInfo {
        string memberName;
        string discordId;
        string avatarImage;
    }

    // Read-only functions
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function DEFAULT_AVATAR() external view returns (string memory);
    function owner() external view returns (address);
    function totalSupply() external view returns (uint256);
    function mintPrice() external pure returns (uint256);
    function maxSupply() external pure returns (uint256);

    // Token ownership and balance functions
    function balanceOf(address account) external view returns (uint256);
    function ownerOf(uint256 tokenId) external view returns (address);
    function tokenOfOwner(address account) external view returns (uint256);
    function hasMinted(address account) external view returns (bool);

    // User information functions
    function getUserInfo(address user) external view returns (
        string memory memberName,
        string memory discordId,
        string memory avatarImage
    );
    function setUserInfo(
        string memory memberName,
        string memory discordId,
        string memory avatarImage
    ) external;

    // Minting and burning functions
    function mint() external;
    function burn(uint256 tokenId) external;

    // Owner functions
    function transferOwnership(address newOwner) external;

    // Disabled transfer functions (will revert)
    function transferFrom(address from, address to, uint256 tokenId) external;
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) external;
    function approve(address to, uint256 tokenId) external;
    function setApprovalForAll(address operator, bool approved) external;
    function getApproved(uint256 tokenId) external view returns (address);
    function isApprovedForAll(address owner, address operator) external view returns (bool);
}