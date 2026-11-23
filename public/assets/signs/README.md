# Sign image library

Each sign image belongs in `asl/` or `isl/`, then a course/lesson folder and sign folder.
Every sign folder must contain `metadata.json` before it contains generated media. The metadata records the authoritative reference, the complete gesture description, generation state, human verification state, and history.

Create a review packet with:

```sh
node scripts/sign-asset-review.mjs --lesson <lesson-slug> --language ASL|ISL --sign <sign> --reference <authoritative-url> --gesture <gesture.json>
```

`metadata.json` begins as `review-required`. It must not be changed to approved or added to the application registry until a qualified sign-language reviewer has compared every displayed frame against the named source. Generated images are intentionally not created by this script: configure an approved, server-side provider separately so no secret reaches the client bundle.
