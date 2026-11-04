# Architecture for the demo

Use this to explain the implemented flow, not to claim that production reliability or quitting effectiveness has been proven.

```mermaid
flowchart TD
    Auth[Google sign-in via Supabase] --> Stage[Server reads authenticated progress]
    Stage --> Journey[Journey: 15 scenes / 4 acts]
    Journey --> Film[Short cinematic scene]
    Film --> Context[Scene dossier + history + living memory]
    Context --> Meta[Meta Model API / Muse Spark]
    Meta --> Output[Reply + routing decision + memory updates]
    Output --> Validate[Validate output and merge corrections]
    Validate --> Stay[Stay with current conversation]
    Stay --> Context
    Validate --> Offer[Offer next scene]
    Offer --> Thought[New thought: keep talking]
    Thought --> Context
    Offer --> Agree[User agrees]
    Agree --> Film
    Validate --> Finale[Final scene: readiness conversation]
    Finale --> Later[Not yet: keep conversation / no count]
    Finale --> Confirm[Explicit last-cigarette timestamp]
    Confirm --> RPC[Locked database lifecycle RPC]
    RPC --> Home[Today / Progress / Support]
    Home --> Metrics[Deterministic count + estimates + sourced milestones]
    Home --> Card[Server memory builds internal player card]
    Card --> Support[Model support conversation]
    Home --> Record[Explicit status correction independent of model]
    Record --> RPC
```

## Evidence to show, in order

1. A film followed by a real personal answer and model response.
2. A correction carried forward rather than a fixed questionnaire branch.
3. A transition offer declined to keep talking, followed by consensual progression.
4. Not yet versus explicit timestamp confirmation.
5. Working home metrics and a real support response using prior memory.

## Honest distinction from a plain chat interface

The product connects authored scene dossiers, structured routing, persistent correction-aware memory, authenticated stage gates and a separate deterministic lifecycle. Demonstrate those behaviours. Their presence does not itself prove dialogue quality or clinical benefit.
