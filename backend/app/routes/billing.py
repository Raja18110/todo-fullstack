from fastapi import APIRouter, Depends, HTTPException, Request, Header, status
from sqlalchemy.orm import Session
import os
import stripe
from typing import Optional
from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/billing", tags=["billing"])

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "mock_stripe_key")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "mock_webhook_secret")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

@router.post("/checkout")
def create_checkout_session(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Fallback/simulation check
    if not stripe.api_key or stripe.api_key == "mock_stripe_key":
        return {
            "url": f"{FRONTEND_URL}?checkout=success&mock=true",
            "message": "Stripe key is missing or is mock. Redirecting to mock checkout page."
        }

    try:
        # Create Stripe Checkout Session
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": "usd",
                        "product_data": {
                            "name": "Todo SaaS Premium Plan",
                            "description": "Unlimited tasks, unlimited projects, and premium visual dashboard analytics.",
                        },
                        "unit_amount": 999, # $9.99
                        "recurring": {"interval": "month"},
                    },
                    "quantity": 1,
                },
            ],
            mode="subscription",
            success_url=f"{FRONTEND_URL}/?checkout=success",
            cancel_url=f"{FRONTEND_URL}/?checkout=cancelled",
            client_reference_id=str(current_user.id),
            customer_email=current_user.email,
        )
        return {"url": checkout_session.url}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create billing session: {str(e)}"
        )

@router.post("/webhook")
async def stripe_webhook(request: Request, stripe_signature: Optional[str] = Header(None, alias="stripe-signature"), db: Session = Depends(get_db)):
    payload = await request.body()
    
    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        # Invalid payload
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        # Invalid signature
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Handle the event
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session.get("client_reference_id")
        if user_id:
            user = db.query(User).filter(User.id == int(user_id)).first()
            if user:
                user.is_premium = True
                db.commit()
                
    elif event["type"] == "customer.subscription.deleted":
        subscription = event["data"]["object"]
        # Find user by customer id or email
        # For simplicity, if we pass email in customer details:
        customer_email = subscription.get("customer_email")
        if customer_email:
            user = db.query(User).filter(User.email == customer_email).first()
            if user:
                user.is_premium = False
                db.commit()

    return {"status": "success"}

@router.post("/mock-upgrade")
def mock_upgrade(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Simulates Stripe webhook success, instantly granting Premium status to the user.
    """
    current_user.is_premium = True
    db.commit()
    db.refresh(current_user)
    return {
        "status": "success",
        "message": f"Successfully upgraded {current_user.email} to Premium Tier! Enjoy unlimited tasks and projects.",
        "user": {
            "email": current_user.email,
            "is_premium": current_user.is_premium
        }
    }

@router.post("/mock-downgrade")
def mock_downgrade(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Simulates canceling the premium plan.
    """
    current_user.is_premium = False
    db.commit()
    db.refresh(current_user)
    return {
        "status": "success",
        "message": f"Successfully downgraded {current_user.email} to Free Tier.",
        "user": {
            "email": current_user.email,
            "is_premium": current_user.is_premium
        }
    }
