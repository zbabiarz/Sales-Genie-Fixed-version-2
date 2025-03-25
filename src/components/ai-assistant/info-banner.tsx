import React from "react";

export function InfoBanner() {
  return (
    <div className="w-full bg-green-100 border border-green-300 rounded-lg p-4 my-4 text-green-800">
      <p className="text-center font-medium">
        Please make sure you include the{" "}
        <span className="font-extrabold text-green-900">company name</span>,{" "}
        <span className="font-extrabold text-green-900">product name</span>, and{" "}
        <span className="font-extrabold text-green-900">product type</span> in
        all each of your questions and prompts to get the most accurate
        responses.
      </p>
    </div>
  );
}
