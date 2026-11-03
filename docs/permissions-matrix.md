# Permissions matrix

| Operation | Authority | Additional checks |
| --- | --- | --- |
| Plan/read group | Current member | Firebase actor, current group access |
| View/list/cancel/resume run | Run owner | Current membership for scoped group, unexpired run |
| Approve/reject | Run owner | Pending exact hash/version; full step selection; context unchanged |
| Create group | Authenticated owner | Explicit approved plan, creator only, existing unique name constraint |
| Set budget | Current creator and member | Existing settings lock, currency, approved plan |
| Add expense | Current member and payer | Approved plan, exact shares/current members, receipt policy, transaction |
| Suggest settlement | Current member | Read-only authoritative balances; never paid/confirmed |
| Enable monitoring | Current member and owner | Explicit consent via approval, budget present |
| Check/view/disable monitoring | Rule owner and current member | Reauthorization; deduped notices; no external delivery |
| Bank/payment/delete/update past record | Unsupported | No Autopilot tool |

Identity is never accepted from request bodies or model output. Actor-owned runs are not a substitute for current group access. Production is denied at route entry independently of flags. Existing manual/MCP routes keep their own existing authorization behavior.
