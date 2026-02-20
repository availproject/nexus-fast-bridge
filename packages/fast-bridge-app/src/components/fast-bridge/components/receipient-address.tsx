"use client";
import { Check, Edit } from "lucide-react";
import * as React from "react";
import type { Address } from "viem";
import { useNexus } from "../../nexus/NexusProvider";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";

interface ReceipientAddressProps {
  address?: Address;
  onChange: (address: string) => void;
}

const ReceipientAddress: React.FC<ReceipientAddressProps> = ({
  address,
  onChange,
}) => {
  const { nexusSDK } = useNexus();
  const [isEditing, setIsEditing] = React.useState(false);
  const fallbackTruncate = (value: string, head = 6, tail = 6) => {
    if (!value) {
      return "";
    }
    if (value.length <= head + tail) {
      return value;
    }
    return `${value.slice(0, head)}...${value.slice(-tail)}`;
  };
  const displayAddress =
    address && nexusSDK?.utils?.truncateAddress
      ? nexusSDK.utils.truncateAddress(address, 6, 6)
      : address
        ? fallbackTruncate(address, 6, 6)
        : "";
  return (
    <div className="w-full">
      {isEditing ? (
        <div className="flex w-full items-center justify-between gap-x-4">
          <Input
            className="w-full font-medium text-base"
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter Recipient Address"
            value={address}
          />
          <Button
            onClick={() => {
              setIsEditing(false);
            }}
            size={"icon"}
            variant={"ghost"}
          >
            <Check className="size-5" />
          </Button>
        </div>
      ) : (
        <div className="flex w-full items-center justify-between">
          <p className="font-medium text-base">Recipient Address</p>
          <div className="flex items-center gap-x-3">
            <p className="font-medium text-base">{displayAddress}</p>

            <Button
              className="size-5 px-0"
              onClick={() => {
                setIsEditing(true);
              }}
              size={"icon"}
              variant={"ghost"}
            >
              <Edit className="size-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceipientAddress;
