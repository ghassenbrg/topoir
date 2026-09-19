# v1alpha2 workspace fixtures

Copies of the target examples from [the design package](../../docs/design/examples/), kept
here so the schema test suite validates the same documents the design ships rather than a
paraphrase of them.

| Fixture | Status against this build |
| --- | --- |
| `architecture` | **Validates.** The architecture family has a body schema |
| `process` | **Rejected** with `TOP105_FAMILY_NOT_IMPLEMENTED`. The family is reserved; T21 implements it |
| `interaction` | **Rejected** with `TOP105_FAMILY_NOT_IMPLEMENTED`. T23 implements it |

Rejection is the intended behavior, not a gap in the fixtures. A family with no body schema
cannot produce a useful diagram, and accepting the document would mean returning an empty
result for something the author reasonably expects to work.

Structural validation is not compilation. `architecture` validates as a *document*; the
compiler does not yet build a diagram from a v1alpha2 workspace. `topoir capabilities`
reports the language as `experimental` for that reason.
