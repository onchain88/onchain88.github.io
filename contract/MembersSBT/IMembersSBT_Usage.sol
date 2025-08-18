// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./Ionchain88MembersSBT.sol";

/**
 * @title onchain88MembersSBT Interface Usage Example
 * @notice インターフェースを使用した実装例
 */
contract onchain88Integration {
    Ionchain88MembersSBT public membersSBT;

    constructor(address _sbtContract) {
        membersSBT = Ionchain88MembersSBT(_sbtContract);
    }

    /**
     * @notice メンバーかどうかを確認
     */
    function isMember(address user) public view returns (bool) {
        return membersSBT.hasMinted(user);
    }

    /**
     * @notice メンバー情報を取得
     */
    function getMemberInfo(address user) public view returns (
        string memory memberName,
        string memory discordId,
        string memory avatarImage,
        bool isMember_
    ) {
        if (membersSBT.hasMinted(user)) {
            (memberName, discordId, avatarImage) = membersSBT.getUserInfo(user);
            isMember_ = true;
        } else {
            memberName = "";
            discordId = "";
            avatarImage = membersSBT.DEFAULT_AVATAR();
            isMember_ = false;
        }
    }

    /**
     * @notice トークンIDからメンバー情報を取得
     */
    function getMemberByTokenId(uint256 tokenId) public view returns (
        address memberAddress,
        string memory memberName,
        string memory discordId,
        string memory avatarImage
    ) {
        memberAddress = membersSBT.ownerOf(tokenId);
        (memberName, discordId, avatarImage) = membersSBT.getUserInfo(memberAddress);
    }

    /**
     * @notice 現在のメンバー数を取得
     */
    function getTotalMembers() public view returns (uint256) {
        return membersSBT.totalSupply();
    }

    /**
     * @notice メンバー限定機能の例
     */
    modifier onlyMembers() {
        require(membersSBT.hasMinted(msg.sender), "Members only");
        _;
    }

    function memberOnlyFunction() public view onlyMembers returns (string memory) {
        return "Welcome to onchain88!";
    }
}