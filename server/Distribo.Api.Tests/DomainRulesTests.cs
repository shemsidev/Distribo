using Distribo.Api.Auth;
using Distribo.Api.Data.Entities;
using Distribo.Api.Services;

namespace Distribo.Api.Tests;

/// <summary>
/// Teste njësi për rregullat që nuk kërkojnë databazë. Rrjedhat e plota (login, katalog, porosi,
/// idempotencë, izolim klientësh) testohen kundër API-së me scripts/api-smoke-test.mjs.
/// </summary>
public class IdentifiersTests
{
    [Theory]
    [InlineData("069 123 4567", "+355691234567")]
    [InlineData("0691234567", "+355691234567")]
    [InlineData("+355 69 123 4567", "+355691234567")]
    [InlineData("355691234567", "+355691234567")]
    [InlineData("00355691234567", "+355691234567")]
    [InlineData("+355 069 123 4567", "+355691234567")]
    [InlineData("691234567", "+355691234567")]
    [InlineData("04 222 3333", "+35542223333")]
    [InlineData("+39 333 1234567", "+393331234567")]
    public void NormalizePhone_accepts_common_formats(string input, string expected) =>
        Assert.Equal(expected, Identifiers.NormalizePhone(input));

    [Theory]
    [InlineData("")]
    [InlineData("123")]
    [InlineData("06912")]
    [InlineData("abc")]
    public void NormalizePhone_rejects_invalid(string input) => Assert.Null(Identifiers.NormalizePhone(input));

    [Fact]
    public void NormalizeEmail_lowercases_and_validates()
    {
        Assert.Equal("emri@biznesi.al", Identifiers.NormalizeEmail("  Emri@Biznesi.AL "));
        Assert.Null(Identifiers.NormalizeEmail("emri@"));
        Assert.Null(Identifiers.NormalizeEmail("emri biznesi@x.al"));
    }

    [Fact]
    public void ValidatePassword_requires_length_letters_and_digits()
    {
        Assert.NotNull(Identifiers.ValidatePassword("abc12"));
        Assert.NotNull(Identifiers.ValidatePassword("abcdefgh"));
        Assert.NotNull(Identifiers.ValidatePassword("12345678"));
        Assert.Null(Identifiers.ValidatePassword("Fjalëkalim1"));
    }
}

public class PasswordHasherTests
{
    [Fact]
    public void Hash_verifies_only_the_original_password_and_uses_random_salt()
    {
        var a = PasswordHasher.Hash("Sekret123");
        var b = PasswordHasher.Hash("Sekret123");
        Assert.NotEqual(a, b);
        Assert.True(PasswordHasher.Verify("Sekret123", a));
        Assert.False(PasswordHasher.Verify("Sekret124", a));
        Assert.False(PasswordHasher.Verify("Sekret123", "format-i-gabuar"));
    }
}

public class OrderStatusRulesTests
{
    [Theory]
    [InlineData(OrderStatus.Pending, OrderStatus.Confirmed, true)]
    [InlineData(OrderStatus.Pending, OrderStatus.Cancelled, true)]
    [InlineData(OrderStatus.Confirmed, OrderStatus.Preparing, true)]
    [InlineData(OrderStatus.Preparing, OrderStatus.InTransit, true)]
    [InlineData(OrderStatus.InTransit, OrderStatus.Delivered, true)]
    [InlineData(OrderStatus.Pending, OrderStatus.Delivered, false)]
    [InlineData(OrderStatus.Preparing, OrderStatus.Cancelled, false)]
    [InlineData(OrderStatus.Delivered, OrderStatus.Cancelled, false)]
    [InlineData(OrderStatus.Cancelled, OrderStatus.Confirmed, false)]
    public void Only_allowed_transitions_pass(OrderStatus from, OrderStatus to, bool allowed) =>
        Assert.Equal(allowed, OrderService.CanTransition(from, to));

    [Fact]
    public void Customer_can_cancel_only_pending_orders()
    {
        Assert.True(OrderService.CustomerCanCancel(OrderStatus.Pending));
        Assert.False(OrderService.CustomerCanCancel(OrderStatus.Confirmed));
        Assert.False(OrderService.CustomerCanCancel(OrderStatus.Delivered));
    }
}
