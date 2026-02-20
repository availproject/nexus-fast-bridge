"use client";
import { Check, Edit } from "lucide-react";
import { type FC, useState } from "react";
import type { Address } from "viem";
import { useNexus } from "../../nexus/nexus-provider";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";

interface RecipientAddressProps {
  address?: Address;
  disabled?: boolean;
  onChange: (address: string) => void;
}

const RecipientAddress: FC<RecipientAddressProps> = ({
  address,
  onChange,
  disabled,
}) => {
  const { nexusSDK } = useNexus();
  const [isEditing, setIsEditing] = useState(false);
  const fallbackTruncate = (value: string, head = 6, tail = 6) => {
    if (!value) {
      return "";
    }
    if (value.length <= head + tail) {
      return value;
    }
    return `${value.slice(0, head)}...${value.slice(-tail)}`;
  };
  let displayAddress = "";
  if (address && nexusSDK?.utils?.truncateAddress) {
    displayAddress = nexusSDK.utils.truncateAddress(address, 6, 6);
  } else if (address) {
    displayAddress = fallbackTruncate(address, 6, 6);
  }
  return (
    <div className="w-full">
      {isEditing ? (
        <div className="flex w-full items-center justify-between gap-x-4">
          <Input
            className="w-full"
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
        <div className="flex w-full flex-col items-start justify-between sm:flex-row sm:items-center">
          <p className="font-light text-base">Recipient Address</p>
          <div className="flex items-center gap-x-3">
            {address && (
              <p className="font-light text-base">{displayAddress}</p>
            )}

            <Button
              className="size-5 px-0"
              disabled={disabled}
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

export default RecipientAddress;
